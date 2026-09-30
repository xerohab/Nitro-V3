/**
 * Client for the Variables Web API (`/api/public/rooms/{roomId}/...`, see docs/wired/web-api.md).
 * Keys only ever travel in the `Authorization` header. After a 429 the client refuses further calls
 * until `Retry-After` has passed instead of retrying.
 */

export type WebApiVariableScope = 'user' | 'furni' | 'global';
export type WebApiUserTargetKind = 'users' | 'pets' | 'bots';
export type WebApiFurniTargetKind = 'floor' | 'wall';
export type WebApiTargetKind = WebApiUserTargetKind | WebApiFurniTargetKind;
export type WebApiHolderScope = Exclude<WebApiVariableScope, 'global'>;
export type WebApiSortField = 'value' | 'entityId';
export type WebApiSortOrder = 'asc' | 'desc';

export interface WebApiVariable {
    name: string;
    scope: WebApiVariableScope;
    hasValue: boolean;
    textConnected: boolean;
}

export interface WebApiEntry {
    entityId: number;
    value?: number;
    createdAt: number;
    updatedAt: number;
}

export interface WebApiEntryPage {
    page: number;
    pageSize: number;
    total: number;
    entries: WebApiEntry[];
}

export interface WebApiStoredValue {
    value?: number;
    createdAt: number;
    updatedAt: number;
}

export interface WebApiProfile {
    targetKind?: string;
    entityId?: number;
    name?: string;
    variables: Record<string, WebApiStoredValue>;
}

export type WebApiValueChange = { value?: number } | { add: number };

export interface WebApiRateLimit {
    limit: number | null;
    remaining: number | null;
    reset: number | null;
}

export type WebApiErrorCode =
    | 'bad_request'
    | 'unauthorized'
    | 'forbidden'
    | 'not_found'
    | 'conflict'
    | 'payload_too_large'
    | 'rate_limited'
    | 'disabled'
    | 'internal'
    | 'timeout'
    | 'network'
    | 'no_key'
    | 'invalid_response';

export class VariablesWebApiError extends Error {
    public readonly status: number;
    public readonly code: WebApiErrorCode | string;
    public readonly retryAfterSeconds: number | null;

    constructor(status: number, code: WebApiErrorCode | string, message: string, retryAfterSeconds: number | null = null) {
        super(message);
        this.name = 'VariablesWebApiError';
        this.status = status;
        this.code = code;
        this.retryAfterSeconds = retryAfterSeconds;
    }
}

export interface VariablesWebApiClientOptions {
    baseUrl: string;
    roomId: number;
    readKey?: string;
    writeKey?: string;
    timeoutMs?: number;
    fetchImpl?: typeof fetch;
    now?: () => number;
}

export const DEFAULT_WEB_API_TIMEOUT_MS = 10_000;
/** Used when a 429 comes without a readable `Retry-After`. */
export const DEFAULT_RETRY_AFTER_SECONDS = 10;
export const MAX_WEB_API_PAGE_SIZE = 100;

type KeyKind = 'read' | 'write';

interface RequestOptions {
    key: KeyKind;
    body?: unknown;
    query?: Record<string, string | number | undefined>;
}

export const parseRetryAfter = (value: string | null, nowMs: number): number | null => {
    if (!value) return null;

    const trimmed = value.trim();

    if (/^\d+$/.test(trimmed)) return Number(trimmed);

    const date = Date.parse(trimmed);

    if (Number.isNaN(date)) return null;

    return Math.max(0, Math.ceil((date - nowMs) / 1000));
};

const readHeaderNumber = (headers: Headers, name: string): number | null => {
    const value = headers.get(name);

    if (value === null || value.trim() === '') return null;

    const number = Number(value);

    return Number.isFinite(number) ? number : null;
};

const segment = (value: string | number): string => encodeURIComponent(String(value));

const readErrorEnvelope = async (response: Response): Promise<{ code: string; message: string } | null> => {
    try {
        const body = (await response.json()) as { error?: { code?: unknown; message?: unknown } };
        const code = body?.error?.code;
        const message = body?.error?.message;

        if (typeof code !== 'string') return null;

        return { code, message: typeof message === 'string' ? message : code };
    } catch {
        return null;
    }
};

const STATUS_CODES: Record<number, WebApiErrorCode> = {
    400: 'bad_request',
    401: 'unauthorized',
    403: 'forbidden',
    404: 'not_found',
    409: 'conflict',
    413: 'payload_too_large',
    429: 'rate_limited'
};

export const createVariablesWebApiClient = (options: VariablesWebApiClientOptions) => {
    const { baseUrl, roomId, readKey = '', writeKey = '', timeoutMs = DEFAULT_WEB_API_TIMEOUT_MS } = options;
    const fetchImpl = options.fetchImpl ?? ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init));
    const now = options.now ?? (() => Date.now());
    const roomBase = `${baseUrl.replace(/\/+$/, '')}/api/public/rooms/${segment(roomId)}`;

    let blockedUntil = 0;
    let rateLimit: WebApiRateLimit = { limit: null, remaining: null, reset: null };

    const keyFor = (kind: KeyKind): string => (kind === 'write' ? writeKey : readKey || writeKey);

    const request = async <T>(method: string, path: string, requestOptions: RequestOptions): Promise<T> => {
        const current = now();

        if (blockedUntil > current) {
            const seconds = Math.ceil((blockedUntil - current) / 1000);

            throw new VariablesWebApiError(429, 'rate_limited', 'Too many requests', seconds);
        }

        const key = keyFor(requestOptions.key);

        if (!key) throw new VariablesWebApiError(0, 'no_key', requestOptions.key === 'write' ? 'A write key is needed' : 'A read key is needed');

        const query = Object.entries(requestOptions.query ?? {})
            .filter(([, value]) => value !== undefined && value !== '')
            .map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`)
            .join('&');
        const url = `${roomBase}${path}${query ? `?${query}` : ''}`;
        const headers: Record<string, string> = { Accept: 'application/json', Authorization: `Bearer ${key}` };
        const hasBody = requestOptions.body !== undefined;

        if (hasBody) headers['Content-Type'] = 'application/json';

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        let response: Response;

        try {
            response = await fetchImpl(url, {
                method,
                headers,
                body: hasBody ? JSON.stringify(requestOptions.body) : undefined,
                signal: controller.signal,
                credentials: 'omit',
                cache: 'no-store',
                referrerPolicy: 'no-referrer'
            });
        } catch (error) {
            if (controller.signal.aborted) throw new VariablesWebApiError(0, 'timeout', 'The request timed out');

            throw new VariablesWebApiError(0, 'network', error instanceof Error && error.message ? error.message : 'Network error');
        } finally {
            clearTimeout(timer);
        }

        rateLimit = {
            limit: readHeaderNumber(response.headers, 'X-RateLimit-Limit'),
            remaining: readHeaderNumber(response.headers, 'X-RateLimit-Remaining'),
            reset: readHeaderNumber(response.headers, 'X-RateLimit-Reset')
        };

        if (!response.ok) {
            const envelope = await readErrorEnvelope(response);
            let retryAfter: number | null = null;

            if (response.status === 429) {
                retryAfter = parseRetryAfter(response.headers.get('Retry-After'), now()) ?? DEFAULT_RETRY_AFTER_SECONDS;
                blockedUntil = now() + retryAfter * 1000;
            }

            throw new VariablesWebApiError(
                response.status,
                envelope?.code ?? STATUS_CODES[response.status] ?? 'internal',
                envelope?.message ?? `HTTP ${response.status}`,
                retryAfter
            );
        }

        if (response.status === 204) return undefined as T;

        try {
            return (await response.json()) as T;
        } catch {
            throw new VariablesWebApiError(response.status, 'invalid_response', 'The server sent an unreadable response');
        }
    };

    const entryPath = (scope: WebApiHolderScope, name: string, targetKind: WebApiTargetKind, entityId: number) =>
        `/variables/${segment(scope)}/${segment(name)}/${segment(targetKind)}/${segment(entityId)}`;

    return {
        get rateLimit(): WebApiRateLimit {
            return rateLimit;
        },
        get blockedForSeconds(): number {
            return Math.max(0, Math.ceil((blockedUntil - now()) / 1000));
        },
        hasReadAccess: !!(readKey || writeKey),
        hasWriteAccess: !!writeKey,

        listVariables: () => request<{ variables: WebApiVariable[] }>('GET', '/variables', { key: 'read' }).then((body) => body?.variables ?? []),

        getEntry: (scope: WebApiHolderScope, name: string, targetKind: WebApiTargetKind, entityId: number) =>
            request<WebApiEntry>('GET', entryPath(scope, name, targetKind, entityId), { key: 'read' }),

        putEntry: (scope: WebApiHolderScope, name: string, targetKind: WebApiTargetKind, entityId: number, value?: number) =>
            request<WebApiEntry>('PUT', entryPath(scope, name, targetKind, entityId), { key: 'write', body: value === undefined ? {} : { value } }),

        patchEntry: (scope: WebApiHolderScope, name: string, targetKind: WebApiTargetKind, entityId: number, change: WebApiValueChange) =>
            request<WebApiEntry>('PATCH', entryPath(scope, name, targetKind, entityId), { key: 'write', body: change }),

        deleteEntry: (scope: WebApiHolderScope, name: string, targetKind: WebApiTargetKind, entityId: number) =>
            request<void>('DELETE', entryPath(scope, name, targetKind, entityId), { key: 'write' }),

        listEntries: (
            scope: WebApiHolderScope,
            name: string,
            targetKind: WebApiTargetKind,
            page: number,
            pageSize: number,
            sort?: WebApiSortField,
            order?: WebApiSortOrder
        ) =>
            request<WebApiEntryPage>('GET', `/variables/${segment(scope)}/${segment(name)}/${segment(targetKind)}`, {
                key: 'read',
                query: { page, pageSize: Math.min(Math.max(1, pageSize), MAX_WEB_API_PAGE_SIZE), sort, order }
            }),

        countEntries: (scope: WebApiHolderScope, name: string, targetKind: WebApiTargetKind) =>
            request<{ count: number }>('GET', `/variables/${segment(scope)}/${segment(name)}/${segment(targetKind)}/count`, { key: 'read' }).then(
                (body) => body?.count ?? 0
            ),

        bulkDelete: (names: string[]) =>
            request<{ deleted: Record<string, number> }>('POST', '/variables/bulk-delete', { key: 'write', body: { names } }).then(
                (body) => body?.deleted ?? {}
            ),

        getGlobal: (name: string) => request<WebApiStoredValue>('GET', `/variables/global/${segment(name)}`, { key: 'read' }),

        patchGlobal: (name: string, change: WebApiValueChange) =>
            request<WebApiStoredValue>('PATCH', `/variables/global/${segment(name)}`, { key: 'write', body: change }),

        getUserProfileByName: (username: string) => request<WebApiProfile>('GET', '/variables_profile/user/users', { key: 'read', query: { name: username } }),

        getProfile: (scope: WebApiHolderScope, targetKind: WebApiTargetKind, entityId: number) =>
            request<WebApiProfile>('GET', `/variables_profile/${segment(scope)}/${segment(targetKind)}/${segment(entityId)}`, { key: 'read' }),

        patchProfile: (scope: WebApiHolderScope, targetKind: WebApiTargetKind, entityId: number, variables: Record<string, number | null | true>) =>
            request<WebApiProfile>('PATCH', `/variables_profile/${segment(scope)}/${segment(targetKind)}/${segment(entityId)}`, {
                key: 'write',
                body: { variables }
            }),

        deleteUserProfile: (targetKind: WebApiUserTargetKind, entityId: number) =>
            request<void>('DELETE', `/variables_profile/user/${segment(targetKind)}/${segment(entityId)}`, { key: 'write' }),

        getGlobalProfile: () => request<WebApiProfile>('GET', '/variables_profile/global', { key: 'read' }),

        patchGlobalProfile: (variables: Record<string, number>) =>
            request<WebApiProfile>('PATCH', '/variables_profile/global', { key: 'write', body: { variables } })
    };
};

export type VariablesWebApiClient = ReturnType<typeof createVariablesWebApiClient>;
