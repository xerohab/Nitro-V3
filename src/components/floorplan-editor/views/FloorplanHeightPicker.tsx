import { FC, PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HEIGHT_BRUSH_MAX, HEIGHT_BRUSH_MIN } from '../state/constants';
import { tileFill } from '../state/selectors';

type Props = {
    selectedH: number;
    onSelect: (h: number) => void;
};

export const FloorplanHeightPicker: FC<Props> = ({ selectedH, onSelect }) => {
    const count = HEIGHT_BRUSH_MAX - HEIGHT_BRUSH_MIN + 1;
    const trackRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const gradient = useMemo(() => {
        const stops: string[] = [];
        for (let i = 0; i < count; i++) {
            const h = HEIGHT_BRUSH_MAX - i;
            const fill = tileFill({ h, blocked: false });
            const startPct = (i / count) * 100;
            const endPct = ((i + 1) / count) * 100;

            stops.push(`${fill} ${startPct.toFixed(2)}%`);
            stops.push(`${fill} ${endPct.toFixed(2)}%`);
        }

        return `linear-gradient(to bottom, ${stops.join(', ')})`;
    }, [count]);

    const heightFromClientY = useCallback(
        (clientY: number): number | null => {
            const track = trackRef.current;

            if (!track) return null;

            const rect = track.getBoundingClientRect();

            if (rect.height === 0) return null;

            const local = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
            const idx = Math.round(local * (count - 1));

            return HEIGHT_BRUSH_MAX - idx;
        },
        [count]
    );

    const onPointerDown = useCallback(
        (e: ReactPointerEvent<HTMLDivElement>) => {
            if (e.button !== 0) return;

            const next = heightFromClientY(e.clientY);

            if (next !== null && next !== selectedH) onSelect(next);

            setIsDragging(true);
        },
        [heightFromClientY, onSelect, selectedH]
    );

    useEffect(() => {
        if (!isDragging) return;

        const onMove = (e: PointerEvent) => {
            const next = heightFromClientY(e.clientY);
            if (next !== null && next !== selectedH) onSelect(next);
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
    }, [isDragging, heightFromClientY, onSelect, selectedH]);

    const thumbPct = ((HEIGHT_BRUSH_MAX - selectedH + 0.5) / count) * 100;
    const thumbColor = tileFill({ h: selectedH, blocked: false });

    return (
        <div
            className={`fp-slider ${isDragging ? 'is-dragging' : ''}`}
            role="slider"
            aria-label="Brush height"
            aria-valuemin={HEIGHT_BRUSH_MIN}
            aria-valuemax={HEIGHT_BRUSH_MAX}
            aria-valuenow={selectedH}
            title={`Brush height ${selectedH}`}
        >
            <div ref={trackRef} data-testid="height-track" className="fp-slider-track" style={{ background: gradient }} onPointerDown={onPointerDown} />
            <div data-testid="height-thumb" data-value={selectedH} data-thumb-color={thumbColor} className="fp-slider-thumb" style={{ top: `calc(6px + (100% - 12px) * ${(thumbPct / 100).toFixed(4)})` }} />
        </div>
    );
};
