import { afterEach, describe, expect, it, vi } from 'vitest';
import { createVariablesWebApiClient, parseRetryAfter, VariablesWebApiError } from './variablesWebApi';

const READ_KEY = 'r'.repeat(43);
const WRITE_KEY = 'w'.repeat(43);

const jsonResponse = (status: number, body: unknown, headers: Record<string, string> = {}) =>
    new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

const makeClient = (fetchImpl: typeof fetch, overrides: Partial<Parameters<typeof createVariablesWebApiClient>[0]> = {}) =>
    createVariablesWebApiClient({ baseUrl: 'https://hotel.example/', roomId: 77, readKey: READ_KEY, writeKey: WRITE_KEY, fetchImpl, ...overrides });

describe('createVariablesWebApiClient', () => {
    afterEach(() => vi.useRealTimers());

    it('reads with the read key in the Authorization header and never in the url', async () => {
        const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
            jsonResponse(200, { variables: [{ name: 'score', scope: 'user', hasValue: true, textConnected: false }] })
        );

        const variables = await makeClient(fetchImpl as unknown as typeof fetch).listVariables();

        expect(variables).toEqual([{ name: 'score', scope: 'user', hasValue: true, textConnected: false }]);
        const [url, init] = fetchImpl.mock.calls[0];
        expect(url).toBe('https://hotel.example/api/public/rooms/77/variables');
        expect(String(url)).not.toContain(READ_KEY);
        expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${READ_KEY}`);
        expect(init.credentials).toBe('omit');
    });

    it('falls back to the write key for reads and uses it for writes', async () => {
        const fetchImpl = vi.fn(async () => jsonResponse(200, { entityId: 5, value: 3, createdAt: 1, updatedAt: 2 }));
        const client = makeClient(fetchImpl as unknown as typeof fetch, { readKey: '' });

        await client.getEntry('user', 'score', 'users', 5);
        await client.patchEntry('user', 'score', 'users', 5, { add: 2 });

        const calls = fetchImpl.mock.calls as unknown as [string, RequestInit][];
        expect((calls[0][1].headers as Record<string, string>).Authorization).toBe(`Bearer ${WRITE_KEY}`);
        expect(calls[1][0]).toBe('https://hotel.example/api/public/rooms/77/variables/user/score/users/5');
        expect(calls[1][1].method).toBe('PATCH');
        expect(calls[1][1].body).toBe('{"add":2}');
        expect((calls[1][1].headers as Record<string, string>)['Content-Type']).toBe('application/json');
    });

    it('refuses a write without a write key before calling the server', async () => {
        const fetchImpl = vi.fn();
        const client = makeClient(fetchImpl as unknown as typeof fetch, { writeKey: '' });

        await expect(client.deleteEntry('furni', 'lamp', 'floor', 9)).rejects.toMatchObject({ code: 'no_key' });
        expect(fetchImpl).not.toHaveBeenCalled();
        expect(client.hasWriteAccess).toBe(false);
    });

    it('turns the error envelope into a typed error', async () => {
        const fetchImpl = vi.fn(async () => jsonResponse(403, { error: { code: 'forbidden', message: 'Bulk delete is not allowed for this key' } }));

        const error = await makeClient(fetchImpl as unknown as typeof fetch)
            .bulkDelete(['score'])
            .catch((caught) => caught);

        expect(error).toBeInstanceOf(VariablesWebApiError);
        expect(error).toMatchObject({ status: 403, code: 'forbidden', message: 'Bulk delete is not allowed for this key' });
    });

    it('stops calling the server after a 429 until Retry-After has passed', async () => {
        let now = 1_000_000;
        const fetchImpl = vi.fn(async () => jsonResponse(429, { error: { code: 'rate_limited', message: 'Slow down' } }, { 'Retry-After': '7' }));
        const client = makeClient(fetchImpl as unknown as typeof fetch, { now: () => now });

        await expect(client.listVariables()).rejects.toMatchObject({ code: 'rate_limited', retryAfterSeconds: 7 });
        await expect(client.listVariables()).rejects.toMatchObject({ code: 'rate_limited', retryAfterSeconds: 7 });
        expect(fetchImpl).toHaveBeenCalledTimes(1);
        expect(client.blockedForSeconds).toBe(7);

        now += 7_001;
        fetchImpl.mockImplementationOnce(async () => jsonResponse(200, { variables: [] }));

        await expect(client.listVariables()).resolves.toEqual([]);
        expect(fetchImpl).toHaveBeenCalledTimes(2);
    });

    it('aborts a request that runs past the timeout', async () => {
        vi.useFakeTimers();

        const fetchImpl = vi.fn(
            (_input: RequestInfo | URL, init?: RequestInit) =>
                new Promise<Response>((_resolve, reject) => init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))))
        );
        const pending = makeClient(fetchImpl as unknown as typeof fetch, { timeoutMs: 500 })
            .listVariables()
            .catch((caught) => caught);

        await vi.advanceTimersByTimeAsync(500);

        expect(await pending).toMatchObject({ code: 'timeout' });
    });

    it('sends paging and sort as query parameters and caps the page size', async () => {
        const fetchImpl = vi.fn(async () => jsonResponse(200, { page: 2, pageSize: 100, total: 130, entries: [] }));

        await makeClient(fetchImpl as unknown as typeof fetch).listEntries('furni', 'lamp', 'wall', 2, 500, 'value', 'desc');

        expect((fetchImpl.mock.calls as unknown as [string][])[0][0]).toBe(
            'https://hotel.example/api/public/rooms/77/variables/furni/lamp/wall?page=2&pageSize=100&sort=value&order=desc'
        );
    });

    it('reads the rate limit headers and treats 204 as success', async () => {
        const fetchImpl = vi.fn(
            async () => new Response(null, { status: 204, headers: { 'X-RateLimit-Limit': '60', 'X-RateLimit-Remaining': '59', 'X-RateLimit-Reset': '10' } })
        );
        const client = makeClient(fetchImpl as unknown as typeof fetch);

        await expect(client.deleteUserProfile('users', 3)).resolves.toBeUndefined();
        expect(client.rateLimit).toEqual({ limit: 60, remaining: 59, reset: 10 });
    });

    it('looks users up by name with an encoded query', async () => {
        const fetchImpl = vi.fn(async () => jsonResponse(200, { targetKind: 'users', entityId: 4, name: 'Bob & Co', variables: {} }));

        await makeClient(fetchImpl as unknown as typeof fetch).getUserProfileByName('Bob & Co');

        expect((fetchImpl.mock.calls as unknown as [string][])[0][0]).toBe(
            'https://hotel.example/api/public/rooms/77/variables_profile/user/users?name=Bob%20%26%20Co'
        );
    });
});

describe('parseRetryAfter', () => {
    it('reads seconds and http dates', () => {
        expect(parseRetryAfter('12', 0)).toBe(12);
        expect(parseRetryAfter(new Date(30_000).toUTCString(), 0)).toBe(30);
        expect(parseRetryAfter('soon', 0)).toBeNull();
        expect(parseRetryAfter(null, 0)).toBeNull();
    });
});
