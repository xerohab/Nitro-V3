/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FloorplanWallHeightSlider } from './FloorplanWallHeightSlider';

const TRACK_HEIGHT = 320;

const stubTrackGeometry = () => {
    const original = HTMLDivElement.prototype.getBoundingClientRect;

    HTMLDivElement.prototype.getBoundingClientRect = function () {
        if (this.getAttribute('data-testid') === 'wall-height-track') {
            return { top: 0, left: 0, right: 14, bottom: TRACK_HEIGHT, width: 14, height: TRACK_HEIGHT, x: 0, y: 0, toJSON: () => '' };
        }

        return original.call(this);
    };

    return () => {
        HTMLDivElement.prototype.getBoundingClientRect = original;
    };
};

describe('FloorplanWallHeightSlider', () => {
    afterEach(() => cleanup());

    it('shows the current value on the thumb', () => {
        render(<FloorplanWallHeightSlider value={7} onChange={() => undefined} />);

        expect(screen.getByTestId('wall-height-thumb').getAttribute('data-value')).toBe('7');
        expect(screen.getByRole('slider').getAttribute('aria-valuenow')).toBe('7');
    });

    it('the top of the ladder is the highest wall, the bottom the lowest', () => {
        const restore = stubTrackGeometry();
        const onChange = vi.fn();

        render(<FloorplanWallHeightSlider value={5} onChange={onChange} />);

        const track = screen.getByTestId('wall-height-track');

        fireEvent.pointerDown(track, { clientY: 0, button: 0 });
        expect(onChange).toHaveBeenLastCalledWith(16);

        fireEvent.pointerDown(track, { clientY: TRACK_HEIGHT, button: 0 });
        expect(onChange).toHaveBeenLastCalledWith(0);

        restore();
    });

    it('dragging keeps updating until the pointer is released', () => {
        const restore = stubTrackGeometry();
        const onChange = vi.fn();

        render(<FloorplanWallHeightSlider value={0} onChange={onChange} />);

        fireEvent.pointerDown(screen.getByTestId('wall-height-track'), { clientY: TRACK_HEIGHT, button: 0 });
        fireEvent.pointerMove(window, { clientY: TRACK_HEIGHT / 2 });
        expect(onChange).toHaveBeenLastCalledWith(8);

        fireEvent.pointerUp(window);
        onChange.mockClear();
        fireEvent.pointerMove(window, { clientY: 0 });
        expect(onChange).not.toHaveBeenCalled();

        restore();
    });

    it('does not fire when the picked value equals the current one', () => {
        const restore = stubTrackGeometry();
        const onChange = vi.fn();

        render(<FloorplanWallHeightSlider value={16} onChange={onChange} />);

        fireEvent.pointerDown(screen.getByTestId('wall-height-track'), { clientY: 0, button: 0 });
        expect(onChange).not.toHaveBeenCalled();

        restore();
    });
});
