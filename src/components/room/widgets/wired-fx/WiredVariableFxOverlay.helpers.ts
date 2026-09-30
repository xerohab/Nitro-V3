import { IWiredVariableFxConfig } from '@octane/renderer';
import { WIRED_FX_CATEGORY } from '../../../../api';
import { IWiredVariableFxStatusEntry } from '../../../../hooks';

export interface IWiredVariableFxDrawn {
    entry: IWiredVariableFxStatusEntry;
    config: IWiredVariableFxConfig;
}

/** Every fx drawn over one avatar or furni, stacked in config order so the pile is stable. */
export interface IWiredVariableFxEntityGroup {
    entityKey: string;
    userEntity: boolean;
    entityId: number;
    drawn: IWiredVariableFxDrawn[];
}

export interface IWiredVariableFxGroups {
    entities: IWiredVariableFxEntityGroup[];
    bosses: IWiredVariableFxDrawn[];
}

/**
 * Pairs each status with its config and sorts them by where they draw: boss bars go to the top
 * of the screen, everything else piles up over its avatar or furni. A status whose config has
 * not arrived yet is skipped rather than drawn wrong.
 */
export const groupWiredVariableFxStatuses = (
    configs: Record<number, IWiredVariableFxConfig>,
    statuses: Record<string, IWiredVariableFxStatusEntry>
): IWiredVariableFxGroups => {
    const entities = new Map<string, IWiredVariableFxEntityGroup>();
    const bosses: IWiredVariableFxDrawn[] = [];

    for (const entry of Object.values(statuses)) {
        const config = configs[entry.status.configId];

        if (!config) continue;

        const drawn: IWiredVariableFxDrawn = { entry, config };

        if (config.category === WIRED_FX_CATEGORY.BOSS_BAR) {
            bosses.push(drawn);
            continue;
        }

        const entityKey = `${entry.status.userEntity ? 'u' : 'f'}:${entry.status.entityId}`;
        let group = entities.get(entityKey);

        if (!group) {
            group = { entityKey, userEntity: entry.status.userEntity, entityId: entry.status.entityId, drawn: [] };
            entities.set(entityKey, group);
        }

        group.drawn.push(drawn);
    }

    const byConfig = (left: IWiredVariableFxDrawn, right: IWiredVariableFxDrawn) =>
        left.config.configId - right.config.configId || left.entry.status.variableId.localeCompare(right.entry.status.variableId);

    for (const group of entities.values()) group.drawn.sort(byConfig);

    bosses.sort((left, right) => byConfig(left, right) || left.entry.status.entityId - right.entry.status.entityId);

    return {
        entities: [...entities.values()].sort((left, right) => left.entityKey.localeCompare(right.entityKey)),
        bosses
    };
};

/** How full each of `count` segments is for a bar at `progress`; the last lit one is partial. */
export const wiredVariableFxSegmentFills = (progress: number, count: number): number[] => {
    const segments = Math.max(1, Math.min(100, Math.trunc(count) || 1));
    const clamped = Math.max(0, Math.min(1, progress));
    const fills: number[] = [];

    for (let index = 0; index < segments; index++) {
        const start = index / segments;
        const end = (index + 1) / segments;

        fills.push(clamped >= end ? 1 : clamped <= start ? 0 : (clamped - start) / (end - start));
    }

    return fills;
};

/** The glyph an icon name is drawn with when the client has no sprite for it. */
export const wiredVariableFxIconGlyph = (icon: string): string => {
    switch (icon) {
        case 'misc_heart':
        case 'health':
            return '♥';
        case 'misc_skull':
            return '☠';
        case 'misc_star':
        case 'star_power':
            return '★';
        case 'shield':
            return '⛨';
        case 'energy':
        case 'battery':
            return '⚡';
        case 'timeleft':
        case 'cooldown':
            return '⏱';
        case 'gold':
        case 'cash':
        case 'gems':
            return '◆';
        case 'droplet':
        case 'mana':
            return '💧';
        case 'burning':
            return '🔥';
        case 'freezing':
            return '❄';
        case 'food':
        case 'fish':
            return '🍖';
        case 'magic':
            return '✦';
        case 'eye':
        case 'stealth':
            return '👁';
        case 'poison':
            return '☣';
        case 'repairing':
        case 'upgrading':
            return '🔧';
        case 'wooden_logs':
            return '🪵';
        default:
            return icon ? '●' : '';
    }
};
