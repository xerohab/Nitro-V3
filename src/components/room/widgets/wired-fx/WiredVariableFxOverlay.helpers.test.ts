import { describe, expect, it } from 'vitest';
import { groupWiredVariableFxStatuses, wiredVariableFxIconGlyph, wiredVariableFxSegmentFills } from './WiredVariableFxOverlay.helpers';

const config = (configId: number, category: number) => ({
    configId,
    userFx: true,
    showMode: 0,
    updateMask: 0,
    showOnMouseHover: false,
    showDurationMs: 3000,
    category,
    styleId: 0,
    colorId: -1,
    widthId: 2,
    rendererId: 0,
    defaultMinValue: 0,
    defaultMaxValue: 100,
    extra: {}
});

const entry = (configId: number, userEntity: boolean, entityId: number, variableId = 'user:20') => {
    const key = `${configId}|${variableId}|${userEntity ? 'u' : 'f'}|${entityId}`;

    return [
        key,
        {
            key,
            status: { configId, variableId, initialize: false, userEntity, entityId, value: 1, overrideMinValue: null, overrideMaxValue: null, extra: {} },
            changedAt: 0,
            previousValue: null
        }
    ] as const;
};

describe('WiredVariableFxOverlay helpers', () => {
    it('piles statuses per avatar or furni, sends boss bars to the top and skips unknown configs', () => {
        const configs = { 7: config(7, 1), 8: config(8, 0), 9: config(9, 4) };
        const statuses = Object.fromEntries([entry(8, true, 100), entry(7, true, 100), entry(7, false, 500), entry(9, true, 100), entry(42, true, 100)]);

        const groups = groupWiredVariableFxStatuses(configs, statuses);

        expect(groups.bosses.map((drawn) => drawn.config.configId)).toEqual([9]);
        expect(groups.entities.map((group) => group.entityKey)).toEqual(['f:500', 'u:100']);
        expect(groups.entities[1].drawn.map((drawn) => drawn.config.configId)).toEqual([7, 8]);
        expect(groups.entities[0].userEntity).toBe(false);
        expect(groups.entities[0].entityId).toBe(500);
    });

    it('lights whole segments and one partial one', () => {
        expect(wiredVariableFxSegmentFills(0.5, 4)).toEqual([1, 1, 0, 0]);
        expect(wiredVariableFxSegmentFills(0.625, 4)).toEqual([1, 1, 0.5, 0]);
        expect(wiredVariableFxSegmentFills(2, 3)).toEqual([1, 1, 1]);
        expect(wiredVariableFxSegmentFills(-1, 2)).toEqual([0, 0]);
        expect(wiredVariableFxSegmentFills(0.5, 0)).toEqual([0.5]);
    });

    it('has a glyph for every named icon and none for no icon', () => {
        expect(wiredVariableFxIconGlyph('misc_heart')).toBe('♥');
        expect(wiredVariableFxIconGlyph('misc_skull')).toBe('☠');
        expect(wiredVariableFxIconGlyph('something_new')).toBe('●');
        expect(wiredVariableFxIconGlyph('')).toBe('');
    });
});
