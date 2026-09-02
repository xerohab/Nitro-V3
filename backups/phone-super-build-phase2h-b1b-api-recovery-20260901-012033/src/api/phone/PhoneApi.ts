import { clearAccessToken, getAccessToken } from '../auth';

const PHONE_API = '/api/phone';

export interface PhoneCatalogItem
{
    id: number;
    key: string;
    type: 'wallpaper' | 'theme' | 'case' | 'sound';
    name: string;
    description: string;
    asset: string;
    currencyType: number;
    price: number;
    metadata?: Record<string, unknown>;
}

export interface PhoneContactSetting
{
    userId: number;
    favourite: boolean;
    nickname?: string;
    messageSoundKey?: string;
    customMessageSoundId?: number | null;
}

export interface PhoneNotification
{
    id: number;
    type: string;
    app: string;
    title: string;
    body: string;
    read: boolean;
    createdAt: number;
    data?: Record<string, unknown>;
}

export interface PhoneUpload
{
    id: number;
    uploadType: 'wallpaper' | 'message_sound' | 'notification_sound';
    originalFilename: string;
    publicUrl: string;
    mimeType: string;
    sizeBytes: number;
    durationMs?: number;
    createdAt: number;
}

export interface PhonePurchase
{
    id: number;
    catalogItemId: number;
    currencyType: number;
    amount: number;
    purchasedAt: number;
    name: string;
    type: string;
}

export interface PhoneState
{
    settings: Record<string, any>;
    catalog: PhoneCatalogItem[];
    owned: number[];
    contacts: PhoneContactSetting[];
    notifications: PhoneNotification[];
    purchases: PhonePurchase[];
    uploads: PhoneUpload[];
    profile: {
        userId?: number;
        username?: string;
        figure?: string;
        motto?: string;
    };
    wallet: {
        credits?: number;
        diamonds?: number;
    };
    serverTime?: number;
}

const request = async <T>(
    path: string,
    init: RequestInit = {}
): Promise<T> =>
{
    const token = getAccessToken();

    if(!token) throw new Error('Phone session is unavailable.');

    const headers: Record<string, string> = {
        Accept: 'application/json',
        Authorization: `Bearer ${ token }`
    };

    if(init.body) headers['Content-Type'] = 'application/json';

    const response = await fetch(`${ PHONE_API }${ path }`, {
        ...init,
        credentials: 'same-origin',
        headers: {
            ...headers,
            ...(init.headers || {})
        }
    });

    if(response.status === 401)
    {
        clearAccessToken();

        throw new Error('Your phone session has expired.');
    }

    let payload: any = null;

    try
    {
        payload = await response.json();
    }
    catch
    {
        payload = null;
    }

    if(!response.ok)
    {
        throw new Error(
            payload?.error
                ? String(payload.error).replaceAll('_', ' ')
                : `Phone request failed (${ response.status })`
        );
    }

    return payload as T;
};

export const getPhoneState = () =>
    request<PhoneState>('/state');

export const savePhoneSettings = (settings: Record<string, unknown>) =>
    request<{ ok: boolean; settings: Record<string, any> }>('/settings', {
        method: 'POST',
        body: JSON.stringify(settings)
    });

export const purchasePhoneItem = (catalogItemId: number) =>
    request<{ ok: boolean; catalogItemId?: number; alreadyOwned?: boolean }>('/purchase', {
        method: 'POST',
        body: JSON.stringify({ catalogItemId })
    });

export const savePhoneContact = (
    contactUserId: number,
    favourite: boolean,
    nickname: string | null,
    messageSoundKey: string | null = null
) =>
    request<{ ok: boolean }>('/contact', {
        method: 'POST',
        body: JSON.stringify({
            contactUserId,
            favourite,
            nickname,
            message_sound_key: messageSoundKey
        })
    });

export const markPhoneNotificationRead = (
    notificationId?: number,
    all = false
) =>
    request<{ ok: boolean }>('/notification/read', {
        method: 'POST',
        body: JSON.stringify(all ? { all: true } : { notificationId })
    });

export const savePhoneReaction = (
    messageId: number,
    reaction: string
) =>
    request<{ ok: boolean }>('/reaction', {
        method: 'POST',
        body: JSON.stringify({ messageId, reaction })
    });

export const managePhoneGroup = (
    conversationId: number,
    action: string,
    extra: Record<string, unknown> = {}
) =>
    request<{ ok: boolean }>('/group', {
        method: 'POST',
        body: JSON.stringify({
            conversationId,
            action,
            ...extra
        })
    });

const fileToBase64 = async (file: File): Promise<string> =>
{
    if(file.size <= 0 || file.size > (2 * 1024 * 1024))
    {
        throw new Error('Uploads must be 2 MB or smaller.');
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const chunkSize = 0x8000;
    let binary = '';

    for(let offset = 0; offset < bytes.length; offset += chunkSize)
    {
        const chunk = bytes.subarray(offset, offset + chunkSize);

        binary += String.fromCharCode(...chunk);
    }

    return btoa(binary);
};

export const uploadPhoneFile = async (
    file: File,
    uploadType: 'wallpaper' | 'message_sound' | 'notification_sound'
) =>
{
    const dataBase64 = await fileToBase64(file);

    return request<{
        ok: boolean;
        id: number;
        uploadType: string;
        publicUrl: string;
        mimeType: string;
        sizeBytes: number;
        durationMs?: number;
    }>('/upload', {
        method: 'POST',
        body: JSON.stringify({
            uploadType,
            originalFilename: file.name,
            dataBase64
        })
    });
};
