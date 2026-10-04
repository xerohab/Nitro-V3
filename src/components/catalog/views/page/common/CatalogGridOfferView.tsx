import { FC, useCallback, useMemo } from 'react';
import { GetFurnitureData, IPurchasableOffer } from '../../../../../api';
import { LayoutGridItemProps } from '../../../../../common';
import { useCatalogActions, useCatalogData, useCatalogUiState } from '../../../../../hooks';
import { CatalogOfferTileView } from './CatalogOfferTileView';

interface CatalogGridOfferViewProps extends LayoutGridItemProps {
    offer: IPurchasableOffer;
    selectOffer: (offer: IPurchasableOffer) => void;
    inventoryVisible: boolean;
    tintColor?: string;
    showTechnicalDetails?: boolean;
    showPrices?: boolean;
}

export const CatalogGridOfferView: FC<CatalogGridOfferViewProps> = (props) => {
    const { offer, selectOffer, inventoryVisible } = props;
    const { requestOfferToMover = null } = useCatalogActions();
    const { currentType } = useCatalogUiState();
    const { currentOffer = null } = useCatalogData();

    // Preserve the pre-merge Solace behaviour: some catalogue/search
    // products arrive without furnitureData attached. Hydrate it before
    // previewing/selecting the offer.
    const hydratedOffer = useMemo(() => {
        if (!offer?.products?.length) return offer;

        for (const product of offer.products) {
            if (product.furnitureData || !product.productClassId) continue;

            const furnitureData = GetFurnitureData(
                product.productClassId,
                product.productType
            );

            if (!furnitureData) continue;

            if (typeof (product as any).setFurnitureData === 'function') {
                (product as any).setFurnitureData(furnitureData);
            } else {
                Object.defineProperty(product, 'furnitureData', {
                    value: furnitureData,
                    writable: true,
                    configurable: true
                });
            }
        }

        return offer;
    }, [offer]);

    const isSelected = useMemo(() => {
        if (!currentOffer || !hydratedOffer) return false;
        if (currentOffer === hydratedOffer) return true;

        const currentClassId = currentOffer.product?.productClassId;
        const tileClassId = hydratedOffer.product?.productClassId;

        return Boolean(
            currentClassId &&
            tileClassId &&
            currentClassId === tileClassId
        );
    }, [currentOffer, hydratedOffer]);

    const handleSelectOffer = useCallback(
        (targetOffer: IPurchasableOffer) => {
            const offerToSelect = targetOffer || hydratedOffer;

            if (offerToSelect) selectOffer(offerToSelect);
        },
        [hydratedOffer, selectOffer]
    );

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
