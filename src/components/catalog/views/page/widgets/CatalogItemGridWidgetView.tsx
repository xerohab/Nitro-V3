import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GetFurnitureData, IPurchasableOffer } from '../../../../../api';
import { AutoGridProps, ClassicScrollAreaView } from '../../../../../common';
import { useCatalogActions, useCatalogData, useCatalogUiState } from '../../../../../hooks';
import { replaceCatalogPageOffers } from '../../../../../hooks/catalog/useCatalog.helpers';
import { useCatalogAdmin } from '../../../CatalogAdminContext';
import { CatalogGridOfferView } from '../common/CatalogGridOfferView';

interface CatalogItemGridWidgetViewProps extends AutoGridProps {
    tintColor?: string;
    showPrices?: boolean;
}

export const CatalogItemGridWidgetView: FC<CatalogItemGridWidgetViewProps> = (props) => {
    const { columnCount = 8, columnMinHeight = 70, tintColor = null, showPrices = true, children = null, className = '', ...rest } = props;
    const { currentOffer = null, currentPage = null, searchResult = null } = useCatalogData();
    const { selectCatalogOffer = null } = useCatalogActions();
    const { setCurrentPage, setCurrentOffer } = useCatalogUiState();
    const catalogAdmin = useCatalogAdmin();
    const adminMode = catalogAdmin?.adminMode ?? false;
    const elementRef = useRef<HTMLDivElement>(null);
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [dropIndex, setDropIndex] = useState<number | null>(null);

    // Safely hydrates furnitureData for offers without throwing strict-mode getter errors
    const offers = useMemo(() => {
        const rawOffers = (searchResult && searchResult.offers) ? searchResult.offers : (currentPage?.offers ?? []);

        for (const offer of rawOffers) {
            if (offer.products && offer.products.length > 0) {
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
            }
        }

        return rawOffers;
    }, [currentPage, searchResult]);

    useEffect(() => {
        if (elementRef.current) elementRef.current.scrollTop = 0;
    }, [currentPage, searchResult]);

    const handleDragStart = useCallback((index: number) => {
        setDragIndex(index);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
        e.preventDefault();
        setDropIndex(index);
    }, []);

    const handleDrop = useCallback(
        (index: number) => {
            if (dragIndex !== null && dragIndex !== index && currentPage?.offers && !searchResult) {
                const reordered = [...currentPage.offers];
                const [moved] = reordered.splice(dragIndex, 1);

                reordered.splice(index, 0, moved);

                setCurrentPage(replaceCatalogPageOffers(currentPage, reordered));

                const orders = reordered.map((o, i) => ({ id: o.offerId, orderNumber: i }));

                catalogAdmin?.reorderOffers(orders, `Reordered offers on page #${currentPage.pageId}`);
            }

            setDragIndex(null);
            setDropIndex(null);
        },
        [dragIndex, currentPage, searchResult, catalogAdmin, setCurrentPage]
    );

    const handleDragEnd = useCallback(() => {
        setDragIndex(null);
        setDropIndex(null);
    }, []);

    if (!currentPage && (!searchResult || !searchResult.offers)) return null;

    const selectOffer = (offer: IPurchasableOffer) => {
        if (!offer) return;

        // Search offers already carry their real catalogue offer/page ids.
        // Set the exact clicked object directly so selection never gets re-resolved
        // against another offer that happens to share an index or transient id.
        if (searchResult) {
            setCurrentOffer?.(offer);
            return;
        }

        selectCatalogOffer?.(offer);
    };

    const renderOfferTile = (offer: IPurchasableOffer, index: number) => {
        const isDragging = dragIndex === index;
        const isDropTarget = dropIndex === index && dragIndex !== index;
        const pageIdKey = currentPage?.pageId ?? 'search';

        const uniqueKey = `offer_${pageIdKey}_${offer.offerId}_${offer.product?.productClassId ?? index}_${index}`;

        // Verify active state matching on productClassId to keep tile highlighting in sync
        const isTileActive = currentOffer ? (
            currentOffer === offer ||
            (currentOffer.product && offer.product && currentOffer.product.productClassId === offer.product.productClassId)
        ) : false;

        return (
            <div
                key={uniqueKey}
                className={`w-[12.5%] min-w-[12.5%] max-w-[12.5%] h-[70px] p-[1.5px] box-border cursor-pointer pointer-events-auto select-none ${isDragging ? 'opacity-40' : ''} ${isDropTarget ? 'ring-2 ring-primary ring-offset-1 rounded' : ''}`}
                draggable={adminMode && !searchResult}
                onDragEnd={adminMode && !searchResult ? handleDragEnd : undefined}
                onDragOver={adminMode && !searchResult ? (e) => handleDragOver(e, index) : undefined}
                onDragStart={adminMode && !searchResult ? () => handleDragStart(index) : undefined}
                onDrop={adminMode && !searchResult ? () => handleDrop(index) : undefined}
            >
                <CatalogGridOfferView
                    itemActive={isTileActive}
                    offer={offer}
                    selectOffer={selectOffer}
                    tintColor={tintColor}
                    showTechnicalDetails={adminMode}
                    showPrices={showPrices}
                />
            </div>
        );
    };

    return (
        <ClassicScrollAreaView className="nitro-catalog-item-grid-scroll-area h-full min-h-0 w-full" viewportRef={elementRef}>
            <div className={`flex flex-wrap w-full align-content-start ${className}`.trim()} role="listbox">
                {offers.length > 0 && offers.map((offer, index) => renderOfferTile(offer, index))}
                {children}
            </div>
        </ClassicScrollAreaView>
    );
};