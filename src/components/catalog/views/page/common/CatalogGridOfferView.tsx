import { FC, useMemo, useCallback } from 'react';
import { GetFurnitureData, IPurchasableOffer } from '../../../../../api';
import { LayoutGridItemProps } from '../../../../../common';
import { useCatalogActions, useCatalogUiState, useInventoryFurni, useCatalogData } from '../../../../../hooks';
import { CatalogOfferTileView } from './CatalogOfferTileView';

interface CatalogGridOfferViewProps extends LayoutGridItemProps {
    offer: IPurchasableOffer;
    selectOffer: (offer: IPurchasableOffer) => void;
    tintColor?: string;
    showTechnicalDetails?: boolean;
    showPrices?: boolean;
}

export const CatalogGridOfferView: FC<CatalogGridOfferViewProps> = (props) => {
    const { offer, selectOffer } = props;
    const { currentOffer } = useCatalogData();
    const { requestOfferToMover = null } = useCatalogActions();
    const { currentType } = useCatalogUiState();
    const { isVisible: inventoryVisible = false } = useInventoryFurni();

    // Hydrate furnitureData safely across all products in the offer
    const hydratedOffer = useMemo(() => {
        if (!offer || !offer.products || !offer.products.length) return offer;

        for (const product of offer.products) {
            if (!product.furnitureData && product.productClassId) {
                const data = GetFurnitureData(product.productClassId, product.productType);
                if (data) {
                    if (typeof (product as any).setFurnitureData === 'function') {
                        (product as any).setFurnitureData(data);
                    } else {
                        Object.defineProperty(product, 'furnitureData', {
                            value: data,
                            writable: true,
                            configurable: true
                        });
                    }
                }
            }
        }

        return offer;
    }, [offer]);

    // Check selection using exact productClassId to keep tile highlighting synced regardless of grid position
    const isSelected = useMemo(() => {
        if (!currentOffer || !hydratedOffer) return false;

        if (currentOffer === hydratedOffer) return true;

        const currentClassId = currentOffer.product?.productClassId;
        const tileClassId = hydratedOffer.product?.productClassId;

        return Boolean(currentClassId && tileClassId && currentClassId === tileClassId);
    }, [currentOffer, hydratedOffer]);

    // Direct click handler binding to pass the specific offer object
    const handleSelectOffer = useCallback((targetOffer: IPurchasableOffer) => {
        const offerToSelect = targetOffer || hydratedOffer;
        if (offerToSelect && selectOffer) {
            selectOffer(offerToSelect);
        }
    }, [hydratedOffer, selectOffer]);

    return (
        <CatalogOfferTileView
            {...props}
            offer={hydratedOffer}
            itemActive={isSelected}
            selectOffer={handleSelectOffer}
            requestOfferToMover={requestOfferToMover}
            currentType={currentType}
            inventoryVisible={inventoryVisible}
        />
    );
};