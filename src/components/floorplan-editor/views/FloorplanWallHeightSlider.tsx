import { CSSProperties, FC, PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from 'react';
import { MAX_WALL_HEIGHT, MIN_WALL_HEIGHT } from '../state/constants';

type Props = {
    value: number;
    onChange: (next: number) => void;
};

export const FloorplanWallHeightSlider: FC<Props> = ({ value, onChange }) => {
    const count = MAX_WALL_HEIGHT - MIN_WALL_HEIGHT + 1;
    const trackRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const valueFromClientY = useCallback(
        (clientY: number): number | null => {
            const track = trackRef.current;

            if (!track) return null;

            const rect = track.getBoundingClientRect();

            if (rect.height === 0) return null;

            const local = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

            return MAX_WALL_HEIGHT - Math.round(local * (count - 1));
        },
        [count]
    );

    const onPointerDown = useCallback(
        (e: ReactPointerEvent<HTMLDivElement>) => {
            if (e.button !== 0) return;

            const next = valueFromClientY(e.clientY);

            if (next !== null && next !== value) onChange(next);

            setIsDragging(true);
        },
        [valueFromClientY, onChange, value]
    );

    useEffect(() => {
        if (!isDragging) return;

        const onMove = (e: PointerEvent) => {
            const next = valueFromClientY(e.clientY);
            if (next !== null && next !== value) onChange(next);
        };
        const onUp = () => setIsDragging(false);

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);

        return () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
        };
    }, [isDragging, valueFromClientY, onChange, value]);

    const clamped = Math.max(MIN_WALL_HEIGHT, Math.min(MAX_WALL_HEIGHT, value));
    const thumbPct = ((MAX_WALL_HEIGHT - clamped + 0.5) / count) * 100;
    const trackStyle = { '--fp-rung': `${(100 / count).toFixed(4)}%` } as CSSProperties;

    return (
        <div
            className={`fp-slider ${isDragging ? 'is-dragging' : ''}`}
            role="slider"
            aria-label="Wall height"
            aria-valuemin={MIN_WALL_HEIGHT}
            aria-valuemax={MAX_WALL_HEIGHT}
            aria-valuenow={clamped}
            title={`Wall height ${clamped}`}
        >
            <div ref={trackRef} data-testid="wall-height-track" className="fp-slider-track is-ladder" style={trackStyle} onPointerDown={onPointerDown} />
            <div data-testid="wall-height-thumb" data-value={clamped} className="fp-slider-thumb" style={{ top: `calc(6px + (100% - 12px) * ${(thumbPct / 100).toFixed(4)})` }} />
        </div>
    );
};
