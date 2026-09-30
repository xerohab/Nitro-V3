import { describe, expect, it } from 'vitest';
import {
    explorerErrorMessage,
    giveableVariables,
    loadRememberedKeys,
    parseInt32,
    profileToEntries,
    rememberedKeysStorageKey,
    sanitizeRoomIdInput,
    saveRememberedKeys,
    validateExplorerConnect,
    webApiEntryToHolder
} from './variablesExplorer';
import { VariablesWebApiError, WebApiVariable } from './variablesWebApi';

const HOTELS = [{ name: 'Main', url: 'https://main.example' }];
const KEY = 'A1_b-'.repeat(8) + 'xyz';

const memoryStorage = (): Storage => {
    const map = new Map<string, string>();

    return {
        get length() {
            return map.size;
        },
        clear: () => map.clear(),
        getItem: (key) => map.get(key) ?? null,
        key: (index) => [...map.keys()][index] ?? null,
        removeItem: (key) => void map.delete(key),
        setItem: (key, value) => void map.set(key, value)
    };
};

describe('validateExplorerConnect', () => {
    it('accepts a hotel, a room id and one key', () => {
        const result = validateExplorerConnect({ hotelUrl: 'https://main.example/', roomId: ' 42 ', readKey: KEY, writeKey: '' }, HOTELS);

        expect(result.errors).toEqual({});
        expect(result.connection).toEqual({ hotelUrl: 'https://main.example', roomId: 42, readKey: KEY, writeKey: '' });
    });

    it('needs a known hotel, a positive room id and at least one key', () => {
        const result = validateExplorerConnect({ hotelUrl: 'https://elsewhere.example', roomId: '0', readKey: '', writeKey: '' }, HOTELS);

        expect(result.connection).toBeNull();
        expect(Object.keys(result.errors).sort()).toEqual(['hotelUrl', 'readKey', 'roomId']);
    });

    it('rejects keys that cannot be api keys', () => {
        const result = validateExplorerConnect(
            { hotelUrl: 'https://main.example', roomId: '5', readKey: 'short', writeKey: 'has spaces in it and more text here' },
            HOTELS
        );

        expect(result.errors.readKey).toBeTruthy();
        expect(result.errors.writeKey).toBeTruthy();
    });

    it('keeps only digits in the room id field', () => {
        expect(sanitizeRoomIdInput('12a3-4')).toBe('1234');
    });
});

describe('remembered keys', () => {
    const connection = { hotelUrl: 'https://main.example', roomId: 9, readKey: KEY, writeKey: '' };

    it('stores keys per hotel and room only when asked', () => {
        const storage = memoryStorage();

        saveRememberedKeys(connection, false, storage);
        expect(storage.length).toBe(0);

        saveRememberedKeys(connection, true, storage);
        expect(loadRememberedKeys('https://main.example', 9, storage)).toEqual({ readKey: KEY, writeKey: '' });
        expect(loadRememberedKeys('https://main.example', 10, storage)).toBeNull();

        saveRememberedKeys(connection, false, storage);
        expect(storage.getItem(rememberedKeysStorageKey('https://main.example', 9))).toBeNull();
    });

    it('survives a storage that throws or holds garbage', () => {
        const throwing = {
            ...memoryStorage(),
            getItem: () => {
                throw new Error('denied');
            },
            setItem: () => {
                throw new Error('denied');
            }
        } as Storage;
        const garbage = memoryStorage();
        garbage.setItem(rememberedKeysStorageKey('https://main.example', 9), '{not json');

        expect(() => saveRememberedKeys(connection, true, throwing)).not.toThrow();
        expect(loadRememberedKeys('https://main.example', 9, throwing)).toBeNull();
        expect(loadRememberedKeys('https://main.example', 9, garbage)).toBeNull();
    });
});

describe('explorer data helpers', () => {
    const variables: WebApiVariable[] = [
        { name: 'score', scope: 'user', hasValue: true, textConnected: false },
        { name: 'vip', scope: 'user', hasValue: false, textConnected: false },
        { name: 'level', scope: 'user', hasValue: true, textConnected: true },
        { name: 'lamp', scope: 'furni', hasValue: true, textConnected: false }
    ];

    it('lists a profile by name and hides values of value-less variables', () => {
        const entries = profileToEntries({ variables: { vip: { createdAt: 1, updatedAt: 1 }, score: { value: 12, createdAt: 2, updatedAt: 3 } } }, variables);

        expect(entries).toEqual([
            { name: 'score', hasValue: true, value: 12, createdAt: 2, updatedAt: 3 },
            { name: 'vip', hasValue: false, value: null, createdAt: 1, updatedAt: 1 }
        ]);
        expect(profileToEntries(null, variables)).toEqual([]);
    });

    it('offers only variables of the scope the holder does not have', () => {
        const entries = profileToEntries({ variables: { score: { value: 1, createdAt: 0, updatedAt: 0 } } }, variables);

        expect(giveableVariables(variables, 'user', entries).map((variable) => variable.name)).toEqual(['level', 'vip']);
    });

    it('turns an api entry into a holder row', () => {
        const holder = webApiEntryToHolder({ entityId: 7, value: 3, createdAt: 100, updatedAt: 200 }, 'furni', 'wall');

        expect(holder).toMatchObject({
            entityType: 2,
            entityId: 7,
            entityName: 'Wall furni #7',
            storage: { value: 3, creationTime: 100_000, lastUpdateTime: 200_000 }
        });
        expect(holder.storage.creationTimeStr).not.toBe('');
    });

    it('parses 32-bit integers only', () => {
        expect(parseInt32('-15')).toBe(-15);
        expect(parseInt32(' 2147483647 ')).toBe(2147483647);
        expect(parseInt32('2147483648')).toBeNull();
        expect(parseInt32('1.5')).toBeNull();
        expect(parseInt32('')).toBeNull();
    });

    it('explains a rate limit with its wait', () => {
        expect(explorerErrorMessage(new VariablesWebApiError(429, 'rate_limited', 'x', 12))).toBe('Too many requests. Try again in 12 s.');
        expect(explorerErrorMessage(new VariablesWebApiError(401, 'unauthorized', 'x'))).toBe('The key was not accepted.');
    });
});
