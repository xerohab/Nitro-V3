import { WiredActionLayoutCode } from './WiredActionLayoutCode';

/**
 * The variable fx boxes, as the server numbers them. Everything here mirrors
 * WiredVariableFxStyles / WiredExtraVariableFx on the gameserver: the int params the editor sends,
 * the style tables the overlay draws from and the per-status extras the server attaches.
 */
export const WIRED_FX_CATEGORY = {
    HEALTH_POINTS: 0,
    PROGRESS_BAR: 1,
    LEVELLING_PROGRESS: 2,
    STATUS_BAR: 3,
    BOSS_BAR: 4,
    NUMBER_DISPLAY: 5
} as const;

export const WIRED_FX_SOURCE = { USER: 0, FURNI: 1 } as const;

export const WIRED_FX_VISIBILITY = {
    ONLY_USER: 0,
    GAME_TEAM: 1,
    EVERYONE: 2,
    HAS_VARIABLE: 3,
    HAS_VARIABLE_WITH_VALUE: 4
} as const;

export const WIRED_FX_SHOW_MODE = { ALWAYS: 0, WHEN_CHANGES: 1, NEVER: 2 } as const;

export const WIRED_FX_OVERRIDE_TARGET = { HOLDER: 0, GLOBAL: 1 } as const;

export const WIRED_FX_COLOR_NOT_APPLICABLE = -1;
export const WIRED_FX_COLOR_DYNAMIC_LEVELLING = 1001;
export const WIRED_FX_COLOR_DYNAMIC_TEAM = 1002;

export const WIRED_FX_SHOW_DURATION_MIN_MS = 1500;
export const WIRED_FX_SHOW_DURATION_MAX_MS = 20000;
export const WIRED_FX_SHOW_DURATION_DEFAULT_MS = 3000;
export const WIRED_FX_SEGMENTS_MAX = 100;
export const WIRED_FX_DEFAULT_MAX_VALUE = 100;
export const WIRED_FX_PARAM_COUNT = 16;

export const WIRED_FX_RENDERER = {
    PLAIN: 0,
    CLASSIC_MINI: 1,
    BLOCK: 2,
    STRIPED: 3,
    ARROW: 4,
    HEARTS: 10,
    HEALTH_BAR: 11,
    HEALTH_CROSS: 12,
    THERMOMETER: 13,
    LEVEL_WITH_PROGRESS: 20,
    LEVEL_DETAILS: 21,
    BOSS: 100,
    NUMBER_STYLED: 200,
    NUMBER_FREEZE: 201
} as const;

/** The status extras the server writes per value. */
export const WIRED_FX_STATUS_EXTRA = {
    CURRENT_LEVEL: 'current_level',
    MAX_LEVEL: 'max_level',
    IS_MAXED: 'is_maxed',
    DELEGATED_COLOR: 'delegated_color'
} as const;

/** The config extras a style carries. */
export const WIRED_FX_CONFIG_EXTRA = {
    ICON: 'icon',
    ICON_ALIGNMENT: 'icon_alignment',
    DESIGN: 'design',
    COLOR: 'color',
    METALLIC: 'metallic',
    SUB_RENDERER: 'sub_renderer',
    SEGMENTS: 'segments'
} as const;

export interface IWiredVariableFxStyle {
    styleId: number;
    key: string;
    fallback: string;
    rendererId: number;
}

const style = (styleId: number, key: string, fallback: string, rendererId: number): IWiredVariableFxStyle => ({ styleId, key, fallback, rendererId });

/** The status bar themes, in the server's order; the style id is the index. */
export const WIRED_FX_STATUS_BAR_THEMES: { icon: string; color: string | null; metallic: boolean }[] = [
    { icon: 'energy', color: '#ffd83d', metallic: false },
    { icon: 'shield', color: '#4aa9f6', metallic: false },
    { icon: 'magic', color: '#8751d1', metallic: false },
    { icon: 'food', color: '#ff9f24', metallic: false },
    { icon: 'stamina', color: '#86d213', metallic: false },
    { icon: 'poison', color: '#8ddc35', metallic: false },
    { icon: 'mana', color: '#268fff', metallic: false },
    { icon: 'health', color: '#7dce35', metallic: false },
    { icon: 'gold', color: '#ffc83d', metallic: true },
    { icon: 'gems', color: '#416bdd', metallic: true },
    { icon: 'honor', color: '#fac384', metallic: false },
    { icon: 'reputation', color: '#ffd83d', metallic: false },
    { icon: 'cooldown', color: '#b8c3cc', metallic: false },
    { icon: 'timeleft', color: '#74b9e8', metallic: false },
    { icon: 'burning', color: '#ff5a1f', metallic: false },
    { icon: 'freezing', color: '#82cfff', metallic: false },
    { icon: 'battery', color: null, metallic: false },
    { icon: 'repairing', color: '#c9c5b8', metallic: true },
    { icon: 'stealth', color: '#6254a8', metallic: false },
    { icon: 'upgrading', color: '#6bdc34', metallic: false },
    { icon: 'star_power', color: '#ffd900', metallic: true },
    { icon: 'droplet', color: '#4aabf5', metallic: false }
];

const STYLES: Record<number, IWiredVariableFxStyle[]> = {
    [WIRED_FX_CATEGORY.HEALTH_POINTS]: [
        style(0, 'wiredfurni.params.variablefx.style.hearts', 'Hearts', WIRED_FX_RENDERER.HEARTS),
        style(1, 'wiredfurni.params.variablefx.style.health_cross', 'Health cross', WIRED_FX_RENDERER.HEALTH_CROSS),
        style(2, 'wiredfurni.params.variablefx.style.thermometer', 'Thermometer', WIRED_FX_RENDERER.THERMOMETER),
        style(3, 'wiredfurni.params.variablefx.style.health_bar', 'Health bar', WIRED_FX_RENDERER.HEALTH_BAR)
    ],
    [WIRED_FX_CATEGORY.PROGRESS_BAR]: [
        style(0, 'wiredfurni.params.variablefx.style.plain', 'Plain', WIRED_FX_RENDERER.PLAIN),
        style(1, 'wiredfurni.params.variablefx.style.block', 'Blocks', WIRED_FX_RENDERER.BLOCK),
        style(2, 'wiredfurni.params.variablefx.style.striped', 'Striped', WIRED_FX_RENDERER.STRIPED),
        style(3, 'wiredfurni.params.variablefx.style.arrow', 'Arrows', WIRED_FX_RENDERER.ARROW),
        style(4, 'wiredfurni.params.variablefx.style.classic_mini', 'Classic mini', WIRED_FX_RENDERER.CLASSIC_MINI)
    ],
    [WIRED_FX_CATEGORY.LEVELLING_PROGRESS]: [
        style(0, 'wiredfurni.params.variablefx.style.level_with_progress', 'Level badge with bar', WIRED_FX_RENDERER.LEVEL_WITH_PROGRESS),
        style(1, 'wiredfurni.params.variablefx.style.level_details', 'Level details', WIRED_FX_RENDERER.LEVEL_DETAILS)
    ],
    [WIRED_FX_CATEGORY.STATUS_BAR]: WIRED_FX_STATUS_BAR_THEMES.map((theme, index) =>
        style(index, `wiredfurni.params.variablefx.icon.${theme.icon}`, theme.icon.replace(/_/g, ' '), WIRED_FX_RENDERER.BLOCK)
    ),
    [WIRED_FX_CATEGORY.BOSS_BAR]: [
        style(0, 'wiredfurni.params.variablefx.style.boss_skull', 'Boss bar with skulls', WIRED_FX_RENDERER.BOSS),
        style(1, 'wiredfurni.params.variablefx.style.boss_plain', 'Boss bar', WIRED_FX_RENDERER.BOSS)
    ],
    [WIRED_FX_CATEGORY.NUMBER_DISPLAY]: [
        style(0, 'wiredfurni.params.variablefx.style.freeze_style', 'Freeze style', WIRED_FX_RENDERER.NUMBER_FREEZE),
        style(1, 'wiredfurni.params.variablefx.style.shalimar', 'Shalimar', WIRED_FX_RENDERER.NUMBER_STYLED),
        style(2, 'wiredfurni.params.variablefx.style.blocky', 'Blocky', WIRED_FX_RENDERER.NUMBER_STYLED)
    ]
};

/** The icons the client ships; the server drops any other name. */
export const WIRED_FX_ICONS = [
    'battery',
    'burning',
    'cash',
    'cooldown',
    'droplet',
    'energy',
    'eye',
    'fish',
    'food',
    'freezing',
    'gems',
    'gold',
    'health',
    'honor',
    'magic',
    'mana',
    'poison',
    'repairing',
    'reputation',
    'shield',
    'stamina',
    'star_power',
    'stealth',
    'timeleft',
    'upgrading',
    'wooden_logs',
    'misc_heart',
    'misc_skull',
    'misc_star'
];

/** The fixed colour palette a colour id below 1000 picks from. */
export const WIRED_FX_PALETTE: { id: number; key: string; fallback: string; hex: string }[] = [
    { id: 0, key: 'wiredfurni.params.variablefx.color.green', fallback: 'Green', hex: '#5fd35f' },
    { id: 1, key: 'wiredfurni.params.variablefx.color.red', fallback: 'Red', hex: '#e04b4b' },
    { id: 2, key: 'wiredfurni.params.variablefx.color.blue', fallback: 'Blue', hex: '#3b7de3' },
    { id: 3, key: 'wiredfurni.params.variablefx.color.yellow', fallback: 'Yellow', hex: '#ffd83d' },
    { id: 4, key: 'wiredfurni.params.variablefx.color.orange', fallback: 'Orange', hex: '#ff9f24' },
    { id: 5, key: 'wiredfurni.params.variablefx.color.purple', fallback: 'Purple', hex: '#8751d1' },
    { id: 6, key: 'wiredfurni.params.variablefx.color.pink', fallback: 'Pink', hex: '#ff6fb5' },
    { id: 7, key: 'wiredfurni.params.variablefx.color.cyan', fallback: 'Cyan', hex: '#4fd6e0' },
    { id: 8, key: 'wiredfurni.params.variablefx.color.white', fallback: 'White', hex: '#f4f4f4' },
    { id: 9, key: 'wiredfurni.params.variablefx.color.grey', fallback: 'Grey', hex: '#9aa3ad' },
    { id: 10, key: 'wiredfurni.params.variablefx.color.black', fallback: 'Black', hex: '#2b2b2b' },
    { id: 11, key: 'wiredfurni.params.variablefx.color.brown', fallback: 'Brown', hex: '#a0663a' }
];

export const WIRED_FX_WIDTHS: { id: number; key: string; fallback: string; px: number }[] = [
    { id: 1, key: 'wiredfurni.params.variablefx.width.small', fallback: 'Small', px: 44 },
    { id: 2, key: 'wiredfurni.params.variablefx.width.medium', fallback: 'Medium', px: 64 },
    { id: 3, key: 'wiredfurni.params.variablefx.width.large', fallback: 'Large', px: 96 },
    { id: 4, key: 'wiredfurni.params.variablefx.width.huge', fallback: 'Huge', px: 140 }
];

export const WIRED_FX_NUMBER_ALIGNMENTS = ['left', 'right', 'double'];

/** The bars a level badge can draw beside it; the category extra picks one by renderer id. */
export const WIRED_FX_LEVEL_BARS = [WIRED_FX_RENDERER.BLOCK, WIRED_FX_RENDERER.STRIPED, WIRED_FX_RENDERER.ARROW];

/** The sixteen int params of every fx box, in wire order. */
export interface IWiredVariableFxParams {
    source: number;
    visibility: number;
    showMode: number;
    showDurationMs: number;
    styleId: number;
    colorId: number;
    widthId: number;
    segments: number;
    defaultMin: number;
    defaultMax: number;
    overrideMinEnabled: boolean;
    overrideMaxEnabled: boolean;
    overrideMinTarget: number;
    overrideMaxTarget: number;
    audienceValue: number;
    categoryExtra: number;
}

/** The tab-separated string param: three variable tokens (`custom:<id>` or empty) and the icon. */
export interface IWiredVariableFxTokens {
    overrideMinToken: string;
    overrideMaxToken: string;
    audienceToken: string;
    icon: string;
}

export const WIRED_FX_TOKEN_SEPARATOR = '\t';

export const wiredVariableFxCategoryOfCode = (code: number): number => {
    switch (code) {
        case WiredActionLayoutCode.VARIABLE_FX_HEALTH_POINTS_EXTRA:
            return WIRED_FX_CATEGORY.HEALTH_POINTS;
        case WiredActionLayoutCode.VARIABLE_FX_PROGRESS_BAR_EXTRA:
            return WIRED_FX_CATEGORY.PROGRESS_BAR;
        case WiredActionLayoutCode.VARIABLE_FX_LEVELLING_PROGRESS_EXTRA:
            return WIRED_FX_CATEGORY.LEVELLING_PROGRESS;
        case WiredActionLayoutCode.VARIABLE_FX_STATUS_BAR_EXTRA:
            return WIRED_FX_CATEGORY.STATUS_BAR;
        case WiredActionLayoutCode.VARIABLE_FX_BOSS_BAR_EXTRA:
            return WIRED_FX_CATEGORY.BOSS_BAR;
        case WiredActionLayoutCode.VARIABLE_FX_NUMBER_DISPLAY_EXTRA:
            return WIRED_FX_CATEGORY.NUMBER_DISPLAY;
        default:
            return -1;
    }
};

export const wiredVariableFxStyles = (category: number): IWiredVariableFxStyle[] => STYLES[category] ?? STYLES[WIRED_FX_CATEGORY.PROGRESS_BAR];

export const wiredVariableFxStyle = (category: number, styleId: number): IWiredVariableFxStyle => {
    const styles = wiredVariableFxStyles(category);

    return styles.find((entry) => entry.styleId === styleId) ?? styles[0];
};

/** Levels and plain numbers have no editable range. */
export const wiredVariableFxUsesRange = (category: number) => category !== WIRED_FX_CATEGORY.LEVELLING_PROGRESS && category !== WIRED_FX_CATEGORY.NUMBER_DISPLAY;

export const wiredVariableFxRendererSupportsSegments = (rendererId: number) =>
    rendererId === WIRED_FX_RENDERER.BLOCK || rendererId === WIRED_FX_RENDERER.ARROW || rendererId === WIRED_FX_RENDERER.THERMOMETER;

/** The renderer a segment count applies to: the style's own, or the bar a level badge draws. */
export const wiredVariableFxSegmentRenderer = (category: number, styleId: number, categoryExtra: number): number => {
    const rendererId = wiredVariableFxStyle(category, styleId).rendererId;

    if (category === WIRED_FX_CATEGORY.LEVELLING_PROGRESS) {
        if (rendererId !== WIRED_FX_RENDERER.LEVEL_WITH_PROGRESS) return WIRED_FX_RENDERER.CLASSIC_MINI;

        return WIRED_FX_LEVEL_BARS.includes(categoryExtra as (typeof WIRED_FX_LEVEL_BARS)[number]) ? categoryExtra : WIRED_FX_RENDERER.BLOCK;
    }

    return rendererId;
};

const int = (values: number[], index: number, fallback: number) => (Array.isArray(values) && index < values.length && Number.isFinite(values[index]) ? Math.trunc(values[index]) : fallback);

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const defaultWiredVariableFxParams = (): IWiredVariableFxParams => ({
    source: WIRED_FX_SOURCE.USER,
    visibility: WIRED_FX_VISIBILITY.EVERYONE,
    showMode: WIRED_FX_SHOW_MODE.ALWAYS,
    showDurationMs: WIRED_FX_SHOW_DURATION_DEFAULT_MS,
    styleId: 0,
    colorId: WIRED_FX_COLOR_NOT_APPLICABLE,
    widthId: 2,
    segments: 0,
    defaultMin: 0,
    defaultMax: WIRED_FX_DEFAULT_MAX_VALUE,
    overrideMinEnabled: false,
    overrideMaxEnabled: false,
    overrideMinTarget: WIRED_FX_OVERRIDE_TARGET.HOLDER,
    overrideMaxTarget: WIRED_FX_OVERRIDE_TARGET.HOLDER,
    audienceValue: 0,
    categoryExtra: 0
});

/** The params as the box sent them, with the server's defaults for anything missing. */
export const readWiredVariableFxParams = (intData: number[], category: number): IWiredVariableFxParams => {
    const defaults = defaultWiredVariableFxParams();
    const styleCount = wiredVariableFxStyles(category).length;

    return {
        source: int(intData, 0, defaults.source) === WIRED_FX_SOURCE.FURNI ? WIRED_FX_SOURCE.FURNI : WIRED_FX_SOURCE.USER,
        visibility: clamp(int(intData, 1, defaults.visibility), WIRED_FX_VISIBILITY.ONLY_USER, WIRED_FX_VISIBILITY.HAS_VARIABLE_WITH_VALUE),
        showMode: clamp(int(intData, 2, defaults.showMode), WIRED_FX_SHOW_MODE.ALWAYS, WIRED_FX_SHOW_MODE.NEVER),
        showDurationMs: clamp(int(intData, 3, defaults.showDurationMs), WIRED_FX_SHOW_DURATION_MIN_MS, WIRED_FX_SHOW_DURATION_MAX_MS),
        styleId: clamp(int(intData, 4, 0), 0, Math.max(0, styleCount - 1)),
        colorId: int(intData, 5, defaults.colorId),
        widthId: int(intData, 6, defaults.widthId),
        segments: clamp(int(intData, 7, 0), 0, WIRED_FX_SEGMENTS_MAX),
        defaultMin: int(intData, 8, defaults.defaultMin),
        defaultMax: int(intData, 9, defaults.defaultMax),
        overrideMinEnabled: int(intData, 10, 0) === 1,
        overrideMaxEnabled: int(intData, 11, 0) === 1,
        overrideMinTarget: int(intData, 12, 0) === WIRED_FX_OVERRIDE_TARGET.GLOBAL ? WIRED_FX_OVERRIDE_TARGET.GLOBAL : WIRED_FX_OVERRIDE_TARGET.HOLDER,
        overrideMaxTarget: int(intData, 13, 0) === WIRED_FX_OVERRIDE_TARGET.GLOBAL ? WIRED_FX_OVERRIDE_TARGET.GLOBAL : WIRED_FX_OVERRIDE_TARGET.HOLDER,
        audienceValue: int(intData, 14, 0),
        categoryExtra: int(intData, 15, 0)
    };
};

export const writeWiredVariableFxParams = (params: IWiredVariableFxParams): number[] => [
    params.source,
    params.visibility,
    params.showMode,
    params.showDurationMs,
    params.styleId,
    params.colorId,
    params.widthId,
    params.segments,
    params.defaultMin,
    params.defaultMax,
    params.overrideMinEnabled ? 1 : 0,
    params.overrideMaxEnabled ? 1 : 0,
    params.overrideMinTarget,
    params.overrideMaxTarget,
    params.audienceValue,
    params.categoryExtra
];

export const readWiredVariableFxTokens = (stringData: string): IWiredVariableFxTokens => {
    const fields = (stringData ?? '').split(WIRED_FX_TOKEN_SEPARATOR);

    return {
        overrideMinToken: fields[0]?.trim() ?? '',
        overrideMaxToken: fields[1]?.trim() ?? '',
        audienceToken: fields[2]?.trim() ?? '',
        icon: fields[3]?.trim() ?? ''
    };
};

export const writeWiredVariableFxTokens = (tokens: IWiredVariableFxTokens): string =>
    [tokens.overrideMinToken, tokens.overrideMaxToken, tokens.audienceToken, tokens.icon].map((field) => (field ?? '').replace(/\t/g, '')).join(WIRED_FX_TOKEN_SEPARATOR);

/** What the overlay needs of a config to size and colour a value. */
export interface IWiredVariableFxConfigLike {
    category: number;
    styleId: number;
    colorId: number;
    widthId: number;
    rendererId: number;
    showMode: number;
    showDurationMs: number;
    defaultMinValue: number;
    defaultMaxValue: number;
    extra: Record<string, string>;
}

export interface IWiredVariableFxStatusLike {
    value: number;
    overrideMinValue: number | null;
    overrideMaxValue: number | null;
    extra: Record<string, string>;
}

/** The range a status is drawn against: its own pair when the server sent one, the config's otherwise. */
export const resolveWiredVariableFxRange = (config: IWiredVariableFxConfigLike, status: IWiredVariableFxStatusLike): { min: number; max: number } => {
    const hasOverrides = status.overrideMinValue !== null && status.overrideMaxValue !== null && status.overrideMinValue !== undefined && status.overrideMaxValue !== undefined;
    const min = hasOverrides ? status.overrideMinValue : config.defaultMinValue;
    let max = hasOverrides ? status.overrideMaxValue : config.defaultMaxValue;

    if (max <= min) max = min + 1;

    return { min, max };
};

/** 0..1 of the way from min to max, clamped. */
export const wiredVariableFxProgress = (value: number, min: number, max: number): number => {
    if (!Number.isFinite(value) || max <= min) return 0;

    return clamp((value - min) / (max - min), 0, 1);
};

export interface IWiredVariableFxLevel {
    level: number;
    maxLevel: number;
    maxed: boolean;
}

export const wiredVariableFxLevel = (status: IWiredVariableFxStatusLike): IWiredVariableFxLevel => {
    const level = parseInt(status.extra?.[WIRED_FX_STATUS_EXTRA.CURRENT_LEVEL] ?? '', 10);
    const maxLevel = parseInt(status.extra?.[WIRED_FX_STATUS_EXTRA.MAX_LEVEL] ?? '', 10);

    return {
        level: Number.isFinite(level) ? level : 1,
        maxLevel: Number.isFinite(maxLevel) ? maxLevel : 1,
        maxed: status.extra?.[WIRED_FX_STATUS_EXTRA.IS_MAXED] === 'true'
    };
};

/** A level's hue: red at level one, green at the cap. */
const levelColor = (level: IWiredVariableFxLevel): string => {
    const span = Math.max(1, level.maxLevel - 1);
    const ratio = clamp((level.level - 1) / span, 0, 1);

    return `hsl(${Math.round(ratio * 120)}, 75%, 50%)`;
};

/**
 * The colour a value is drawn in: the holder's team colour or level hue when the box asked for a
 * dynamic one, a palette entry, the status bar theme's baked colour, or null for "the style's own".
 */
export const resolveWiredVariableFxColor = (config: IWiredVariableFxConfigLike, status: IWiredVariableFxStatusLike): string | null => {
    if (config.colorId === WIRED_FX_COLOR_DYNAMIC_TEAM) return status.extra?.[WIRED_FX_STATUS_EXTRA.DELEGATED_COLOR] ?? null;

    if (config.colorId === WIRED_FX_COLOR_DYNAMIC_LEVELLING) return levelColor(wiredVariableFxLevel(status));

    const palette = WIRED_FX_PALETTE.find((entry) => entry.id === config.colorId);

    if (palette) return palette.hex;

    if (config.category === WIRED_FX_CATEGORY.STATUS_BAR) {
        const baked = config.extra?.[WIRED_FX_CONFIG_EXTRA.COLOR];

        if (baked) return baked;

        // The battery runs red to green with its charge.
        const range = resolveWiredVariableFxRange(config, status);

        return `hsl(${Math.round(wiredVariableFxProgress(status.value, range.min, range.max) * 120)}, 75%, 50%)`;
    }

    return null;
};

export const wiredVariableFxWidthPx = (widthId: number): number => (WIRED_FX_WIDTHS.find((entry) => entry.id === widthId) ?? WIRED_FX_WIDTHS[1]).px;

/** Compact numbers so a boss bar reads "1.2k / 5k" instead of overflowing. */
export const formatWiredVariableFxValue = (value: number): string => {
    if (!Number.isFinite(value)) return '0';

    const abs = Math.abs(value);

    if (abs < 10000) return String(Math.trunc(value));
    if (abs < 1000000) return `${(value / 1000).toFixed(abs < 100000 ? 1 : 0).replace(/\.0$/, '')}k`;
    if (abs < 1000000000) return `${(value / 1000000).toFixed(1).replace(/\.0$/, '')}M`;

    return `${(value / 1000000000).toFixed(1).replace(/\.0$/, '')}B`;
};

/**
 * Whether a value is on screen right now: always, never, or only for the show duration after it
 * last changed. Returns the moment it hides, or null when that never happens on its own.
 */
export const wiredVariableFxVisibleUntil = (config: IWiredVariableFxConfigLike, changedAt: number, now: number): { visible: boolean; until: number | null } => {
    switch (config.showMode) {
        case WIRED_FX_SHOW_MODE.NEVER:
            return { visible: false, until: null };
        case WIRED_FX_SHOW_MODE.WHEN_CHANGES: {
            const until = changedAt + Math.max(WIRED_FX_SHOW_DURATION_MIN_MS, config.showDurationMs || 0);

            return { visible: now < until, until };
        }
        default:
            return { visible: true, until: null };
    }
};
