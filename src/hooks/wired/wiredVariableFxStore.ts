import { IWiredVariableFxConfig, IWiredVariableFxStatus, IWiredVariableFxStatusKey, wiredVariableFxStatusKey } from '@octane/renderer';
import { createOctaneStore } from '../../state/createOctaneStore';

/** A drawn value with when it last changed, which the "show when changing" mode counts from. */
export interface IWiredVariableFxStatusEntry {
    key: string;
    status: IWiredVariableFxStatus;
    changedAt: number;
    previousValue: number | null;
}

export type WiredVariableFxState = {
    configs: Record<number, IWiredVariableFxConfig>;
    statuses: Record<string, IWiredVariableFxStatusEntry>;
};

export type WiredVariableFxActions = {
    applyConfigs(configs: IWiredVariableFxConfig[]): void;
    removeConfigs(configIds: number[]): void;
    applyStatuses(initializeAll: boolean, statuses: IWiredVariableFxStatus[], now?: number): void;
    removeStatuses(keys: IWiredVariableFxStatusKey[]): void;
    clear(): void;
};

/**
 * What the room's variable fx boxes are showing this player: the configs by fx box id and the
 * values by their wire key. The server only ever sends diffs, so the store is the whole picture.
 */
export const useWiredVariableFxStore = createOctaneStore<WiredVariableFxState & WiredVariableFxActions>()((set) => ({
    configs: {},
    statuses: {},

    applyConfigs: (configs) =>
        set((state) => {
            if (!configs?.length) return state;

            const next = { ...state.configs };

            for (const config of configs) next[config.configId] = config;

            return { configs: next };
        }),

    removeConfigs: (configIds) =>
        set((state) => {
            if (!configIds?.length) return state;

            const removed = new Set(configIds);
            const configs = { ...state.configs };
            const statuses = { ...state.statuses };

            for (const configId of removed) delete configs[configId];

            // A status for a config the client no longer knows draws nothing; drop it too.
            for (const key of Object.keys(statuses)) {
                if (removed.has(statuses[key].status.configId)) delete statuses[key];
            }

            return { configs, statuses };
        }),

    applyStatuses: (initializeAll, statuses, now = Date.now()) =>
        set((state) => {
            if (!statuses?.length && !initializeAll) return state;

            const next: Record<string, IWiredVariableFxStatusEntry> = initializeAll ? {} : { ...state.statuses };

            for (const status of statuses ?? []) {
                const key = wiredVariableFxStatusKey(status);
                const previous = initializeAll ? null : state.statuses[key];
                const changed = !previous || previous.status.value !== status.value;

                next[key] = {
                    key,
                    status,
                    // "Initialize" is drawn as it is, not as a change: it keeps the old timestamp.
                    changedAt: status.initialize && previous ? previous.changedAt : changed ? now : previous.changedAt,
                    previousValue: previous ? previous.status.value : null
                };
            }

            return { statuses: next };
        }),

    removeStatuses: (keys) =>
        set((state) => {
            if (!keys?.length) return state;

            const statuses = { ...state.statuses };

            for (const key of keys) delete statuses[wiredVariableFxStatusKey(key)];

            return { statuses };
        }),

    clear: () => set({ configs: {}, statuses: {} })
}));
