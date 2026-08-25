import { GetAvatarRenderManager, GetSessionDataManager, Vector3d } from '@nitrots/nitro-renderer';
import { FC, useEffect } from 'react';
import { FurniCategory, GetFurnitureData, Offer, ProductTypeEnum } from '../../../../../api';
import { AutoGrid, Column, LayoutGridItem, LayoutRoomPreviewerView } from '../../../../../common';
import { useCatalogData, useCatalogUiState } from '../../../../../hooks';

export const CatalogViewProductWidgetView: FC<{ height?: number }> = (props) => {
    const { height = 240 } = props;
    const { currentOffer = null, roomPreviewer = null } = useCatalogData();
    const { purchaseOptions = null } = useCatalogUiState();
    const { previewStuffData = null } = purchaseOptions ?? {};

    useEffect(() => {
        if (!currentOffer || currentOffer.pricingModel === Offer.PRICING_MODEL_BUNDLE || !roomPreviewer) return;

        const product = currentOffer.product;
        if (!product) return;

        // Search offers can arrive without furnitureData even though the product class id is valid.
        // Hydrate it before the Dev preview code runs so search previews behave like normal page offers.
        const furniData = product.furnitureData || GetFurnitureData(product.productClassId, product.productType);
        if (!product.furnitureData && furniData) {
            if (typeof (product as any).setFurnitureData === 'function') (product as any).setFurnitureData(furniData);
            else Object.defineProperty(product, 'furnitureData', { value: furniData, writable: true, configurable: true });
        }

        roomPreviewer.reset(false);
        roomPreviewer.addViewOffset.y = product.isUniqueLimitedItem ? -15 : 0;
        roomPreviewer.centerWallItems = true;
        roomPreviewer.setAutomaticStateChange(false);
        roomPreviewer.updateRoomWallsAndFloorVisibility(true, true);

        let animateFurnitureState = false;

        const populate = () => {
            switch (product.productType) {
                case ProductTypeEnum.FLOOR: {
                    if (!furniData && !product.productClassId) {
                        roomPreviewer.reset(false);
                        return;
                    }

                    const sessionData = GetSessionDataManager().getFloorItemData(product.furnitureData?.id ?? furniData?.id ?? product.productClassId);
                    const isPurchasableClothing = furniData?.specialType === FurniCategory.FIGURE_PURCHASABLE_SET;

                    if (isPurchasableClothing) {
                        const sessionDataManager = GetSessionDataManager();
                        const avatarRenderManager = GetAvatarRenderManager();
                        const customParams = sessionData?.customParams ?? furniData?.customParams ?? '';
                        const customParts = customParams
                            .split(',')
                            .map((value) => value.trim())
                            .filter((value) => /^\d+$/.test(value))
                            .map(Number);
                        const figureSets: number[] = [];

                        for (const part of customParts) {
                            if (!Number.isSafeInteger(part) || part <= 0) continue;
                            if (avatarRenderManager.isValidFigureSetForGender(part, sessionDataManager.gender)) figureSets.push(part);
                        }

                        const figureString = avatarRenderManager.getFigureStringWithFigureIds(sessionDataManager.figure, sessionDataManager.gender, figureSets);
                        roomPreviewer.addAvatarIntoRoom(figureString || sessionDataManager.figure, 0);
                        roomPreviewer.zoomIn();
                    } else {
                        roomPreviewer.reset(true);
                        roomPreviewer.addFurnitureIntoRoom(product.productClassId, new Vector3d(90), previewStuffData, product.extraParam);
                        animateFurnitureState = true;
                    }
                    return;
                }
                case ProductTypeEnum.WALL: {
                    if (!furniData && !product.productClassId) {
                        roomPreviewer.reset(false);
                        return;
                    }

                    roomPreviewer.updateRoomWallsAndFloorVisibility(true, true);
                    const specialType = furniData?.specialType ?? FurniCategory.NONE;

                    switch (specialType) {
                        case FurniCategory.FLOOR:
                            roomPreviewer.reset(true);
                            roomPreviewer.updateObjectRoom(product.extraParam);
                            return;
                        case FurniCategory.WALL_PAPER:
                            roomPreviewer.reset(true);
                            roomPreviewer.updateObjectRoom(null, product.extraParam);
                            return;
                        case FurniCategory.LANDSCAPE: {
                            roomPreviewer.updateObjectRoom(null, null, product.extraParam);
                            const windowData = GetSessionDataManager().getWallItemDataByName('window_double_default');
                            if (windowData) roomPreviewer.addWallItemIntoRoom(windowData.id, new Vector3d(90), windowData.customParams);
                            else roomPreviewer.reset(false);
                            return;
                        }
                        default:
                            roomPreviewer.updateObjectRoom('101', '101', '1.1');
                            roomPreviewer.addWallItemIntoRoom(product.productClassId, new Vector3d(90), product.extraParam);
                            animateFurnitureState = true;
                            return;
                    }
                }
                case ProductTypeEnum.ROBOT:
                    roomPreviewer.addAvatarIntoRoom(product.extraParam, 0);
                    roomPreviewer.zoomIn();
                    return;
                case ProductTypeEnum.EFFECT:
                    roomPreviewer.addAvatarIntoRoom(GetSessionDataManager().figure, product.productClassId);
                    roomPreviewer.zoomIn();
                    return;
                default:
                    roomPreviewer.reset(false);
                    return;
            }
        };

        populate();
        roomPreviewer.setAutomaticStateChange(animateFurnitureState);
    }, [currentOffer, currentOffer?.product?.productClassId, previewStuffData, roomPreviewer]);

    if (!currentOffer) return null;

    if (currentOffer.pricingModel === Offer.PRICING_MODEL_BUNDLE) {
        return (
            <Column fit className="bg-muted p-2 rounded" overflow="hidden">
                <AutoGrid fullWidth className="nitro-catalog-layout-bundle-grid" columnCount={4}>
                    {currentOffer.products.length > 0 &&
                        currentOffer.products.map((product, index) => {
                            return <LayoutGridItem key={index} itemCount={product.productCount} itemImage={product.getIconUrl(currentOffer)} />;
                        })}
                </AutoGrid>
            </Column>
        );
    }

    const previewKey = `preview_${currentOffer.offerId}_${currentOffer.product?.productClassId ?? 'none'}`;
    return <LayoutRoomPreviewerView key={previewKey} height={height} roomPreviewer={roomPreviewer} />;
};
