import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCatalogProductMetadata, useCatalogUiState } from '../../../../../hooks';
import { CatalogProductDetailsView } from './CatalogProductDetailsView';

vi.mock('../../../../../api', () => ({
    CatalogType: { BUILDER: 'BUILDERS_CLUB' },
    LocalizeText: (key: string) => key,
    ProductTypeEnum: { FLOOR: 's', WALL: 'i' }
}));

vi.mock('../../../../../hooks', () => ({
    useCatalogProductMetadata: vi.fn(),
    useCatalogUiState: vi.fn()
}));

beforeEach(() => {
    vi.mocked(useCatalogProductMetadata).mockReturnValue(null);
    vi.mocked(useCatalogUiState).mockReturnValue({ currentType: 'NORMAL' } as any);
});

afterEach(cleanup);

describe('catalog product details', () => {
    it('shows the localized identity and useful purchase capabilities', () => {
        const offer = {
            localizationName: 'Lampada lunare',
            localizationDescription: 'Illumina la stanza con una luce soffusa.',
            offerId: 71,
            page: { pageId: 17 },
            giftable: true,
            clubLevel: 1,
            pricingModel: 'single',
            product: {
                productCount: 1,
                isUniqueLimitedItem: true,
                uniqueLimitedItemsLeft: 7,
                uniqueLimitedItemSeriesSize: 100
            }
        } as any;

        render(<CatalogProductDetailsView offer={offer} />);

        expect(screen.getByRole('group', { name: 'Lampada lunare' })).toBeInTheDocument();
        expect(screen.getByText('Illumina la stanza con una luce soffusa.')).toBeInTheDocument();
        expect(screen.queryByText('7 / 100')).not.toBeInTheDocument();
        expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });

    it('shows only the AIR negative capability bitmaps', () => {
        vi.mocked(useCatalogProductMetadata).mockReturnValue([{ itemBaseId: 4, offerId: 71, productClassId: 9, recyclable: true, tradeable: false }]);
        const offer = {
            localizationDescription: '',
            localizationName: 'Sedia',
            offerId: 71,
            page: { pageId: 17 },
            product: { furnitureData: { id: 4 }, productClassId: 9, productData: { name: 'Sedia' }, productType: 's' }
        } as any;

        render(<CatalogProductDetailsView offer={offer} />);

        const noTrade = screen.getByRole('listitem', { name: 'shop.marketplace.item.not.tradeable' });
        const noRecycle = screen.getByRole('listitem', { name: 'recycler.alert.non.recyclable' });

        expect(noTrade).toHaveClass('is-no-trade');
        expect(noTrade.querySelector('img')).toHaveAttribute('src', expect.stringContaining('inventory-furni-no-trade'));
        expect(noRecycle).toHaveClass('is-no-recycle');
        expect(noRecycle.querySelector('img')).toHaveAttribute('src', expect.stringContaining('inventory-furni-no-recycle'));
    });
});
