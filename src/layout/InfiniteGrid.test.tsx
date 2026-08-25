import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InfiniteGrid } from './InfiniteGrid';

vi.mock('@tanstack/react-virtual', () => ({
    useVirtualizer: () => ({
        getTotalSize: () => 700,
        getVirtualItems: () => [{ index: 0, key: 0, size: 70, start: 0 }],
        measureElement: vi.fn(),
        scrollToIndex: vi.fn()
    })
}));

afterEach(() => {
    vi.restoreAllMocks();
});

describe('InfiniteGrid responsive columns', () => {
    it('excludes scrollbar padding when calculating virtualized columns', async () => {
        vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(580);
        vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(200);
        vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(800);
        vi.spyOn(window, 'getComputedStyle').mockReturnValue({
            paddingLeft: '0px',
            paddingRight: '17px'
        } as CSSStyleDeclaration);

        const { container } = render(
            <InfiniteGrid
                classicScrollbar
                columnCount={6}
                estimateSize={70}
                itemMinWidth={53}
                items={Array.from({ length: 100 }, (_, index) => index + 1)}
                itemRender={(item) => <span>{item}</span>}
            />
        );

        await waitFor(() => {
            const firstRow = container.querySelector<HTMLElement>('[data-index="0"]');

            expect(firstRow?.children).toHaveLength(9);
            expect(firstRow?.style.gridTemplateColumns).toBe('repeat(auto-fill, minmax(53px, 1fr))');
        });
    });

});
