/**
 * Return the browser's real device-pixel ratio for the Pixi backing buffer.
 *
 * Do not round this value up. Fractional DPR values are normal on Windows
 * display scaling (for example 1.25 / 1.5 / 1.75). Rounding them to the next
 * integer makes Pixi render at a density that no longer matches the browser's
 * CSS pixel grid and is especially noticeable on high-resolution displays.
 */
export const GetRendererResolution = (): number => {
    if (typeof window === 'undefined') return 1;

    const resolution = Number(window.devicePixelRatio);

    return Number.isFinite(resolution) && resolution > 0 ? resolution : 1;
};
