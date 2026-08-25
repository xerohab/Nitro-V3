import { InfiniteGrid } from '@layout/InfiniteGrid';
import { CSSProperties, FC, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CatalogType, GetFurnitureData, IPurchasableOffer } from '../../../../../api';
import { AutoGrid, AutoGridProps, ClassicScrollAreaView } from '../../../../../common';
import { useCatalogActions, useCatalogData, useCatalogUiState } from '../../../../../hooks';
import { replaceCatalogPageOffers } from '../../../../../hooks/catalog/useCatalog.helpers';
import { useCatalogAdmin } from '../../../CatalogAdminContext';
import { CatalogGridOfferView } from '../common/CatalogGridOfferView';
import { getAirCatalogColumnCount, isAirBaseCatalogOffer, layoutAirCatalogOffers } from '../common/catalogAirGrid.helpers';
import { shouldVirtualizeCatalogOffers } from './catalogGridPerformance.helpers';

interface CatalogItemGridWidgetViewProps extends AutoGridProps {
    tintColor?: string;
    showPrices?: boolean;
}

export const CatalogItemGridWidgetView: FC<CatalogItemGridWidgetViewProps> = (props) => {
    const {
        columnCount = 5,
        columnMinHeight = 80,
        columnMinWidth = 40,
        tintColor = null,
        showPrices = true,
        children = null,
        className = '',
        style = {},
        ...rest
    } = props;
    const { currentOffer = null, currentPage = null, searchResult = null } = useCatalogData();
    const { selectCatalogOffer = null } = useCatalogActions();
    const { currentType = CatalogType.NORMAL, setCurrentPage, setCurrentOffer } = useCatalogUiState();
    const catalogAdmin = useCatalogAdmin();
    const adminMode = catalogAdmin?.adminMode ?? false;
    const elementRef = useRef<HTMLDivElement>(null);
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [dropIndex, setDropIndex] = useState<number | null>(null);
    const [airColumnCount, setAirColumnCount] = useState(columnCount);
    const baseGridClassName = columnCount > 1 && !className.split(/\s+/).includes('nitro-catalog-grid') ? `${className} nitro-catalog-grid`.trim() : className;
    const isAirStandardDensity = className.split(/\s+/).includes('nitro-catalog-grid-density-standard');

    // Search results are virtual offers. Keep those exact objects so clicks and purchases
    // stay tied to the real catalogue offer/page ids added by CatalogSearchView.
    // Also hydrate furnitureData so previews work for search offers.
    const offers = useMemo(() => {
        const rawOffers = searchResult?.offers ?? currentPage?.offers ?? [];

        for (const offer of rawOffers) {
            for (const product of offer.products ?? []) {
                if (product.furnitureData || !product.productClassId) continue;

                const data = GetFurnitureData(product.productClassId, product.productType);
                if (!data) continue;

                if (typeof (product as any).setFurnitureData === 'function') (product as any).setFurnitureData(data);
                else Object.defineProperty(product, 'furnitureData', { value: data, writable: true, configurable: true });
            }
        }

        return rawOffers;
    }, [currentPage, searchResult]);
    const hasAirBaseOffer = offers.some((offer) => isAirBaseCatalogOffer(offer, currentType));
    const hasAirPricedOffer = offers.some((offer) => !isAirBaseCatalogOffer(offer, currentType));
    const usesAirMixedGridTemplate = isAirStandardDensity && hasAirBaseOffer && hasAirPricedOffer;
    const usesAirBaseGridTemplate = isAirStandardDensity && offers.length > 0 && hasAirBaseOffer && !hasAirPricedOffer;
    const effectiveColumnMinHeight = usesAirBaseGridTemplate ? 36 : columnMinHeight;
    const effectiveColumnMinWidth = usesAirBaseGridTemplate ? 36 : columnMinWidth;
    const gridClassName =
        `${baseGridClassName} ${usesAirBaseGridTemplate ? 'uses-base-grid-template' : ''} ${usesAirMixedGridTemplate ? 'uses-mixed-grid-template' : ''} ${currentType === CatalogType.BUILDER ? 'is-builder-grid' : ''}`.trim();
    const useVirtualGrid = shouldVirtualizeCatalogOffers(offers.length, adminMode) && !usesAirMixedGridTemplate;
    const airGridStyle = {
        ...style,
        ...(isAirStandardDensity && { '--nitro-air-column-count': airColumnCount.toString() })
    } as CSSProperties;
    const mixedLayout = useMemo(() => layoutAirCatalogOffers(offers, airColumnCount, currentType), [airColumnCount, currentType, offers]);

    useEffect(() => {
        if (elementRef.current) {
            elementRef.current.scrollLeft = 0;
            elementRef.current.scrollTop = 0;
        }
    }, [currentPage, searchResult]);

    useLayoutEffect(() => {
        if (!isAirStandardDensity || !offers.length) {
            setAirColumnCount(columnCount);
            return;
        }

        const element = elementRef.current;
        if (!element) return;

        const recompute = () => {
            const computedStyle = window.getComputedStyle(element);
            const parsedLeft = Number.parseFloat(computedStyle.paddingLeft);
            const parsedRight = Number.parseFloat(computedStyle.paddingRight);
            const horizontalPadding = (Number.isFinite(parsedLeft) ? parsedLeft : 0) + (Number.isFinite(parsedRight) ? parsedRight : 0);
            const availableWidth = element.clientWidth - horizontalPadding;

            if (availableWidth <= 0) return;

            setAirColumnCount(getAirCatalogColumnCount(offers, availableWidth, currentType));
        };

        recompute();

        if (typeof ResizeObserver === 'undefined') return;

        const observer = new ResizeObserver(recompute);
        observer.observe(element);

        return () => observer.disconnect();
    }, [columnCount, currentType, isAirStandardDensity, offers]);

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

    const renderOfferTile = (offer: IPurchasableOffer, index: number, airPosition: { x: number; y: number; width: number; height: number } | null = null) => {
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
                key={`offer_${currentPage?.pageId ?? 'search'}_${offer.offerId}_${offer.product?.productClassId ?? index}_${index}`}
                className={`${isDragging ? 'opacity-40' : ''} ${isDropTarget ? 'ring-2 ring-primary ring-offset-1 rounded' : ''}`}
                data-air-offer-index={airPosition ? index : undefined}
                draggable={adminMode && !searchResult}
                style={
                    airPosition
                        ? { position: 'absolute', left: airPosition.x, top: airPosition.y, width: airPosition.width, height: airPosition.height }
                        : undefined
                }
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

    if (usesAirMixedGridTemplate) {
        return (
            <ClassicScrollAreaView className="nitro-catalog-item-grid-scroll-area h-full min-h-0" viewportRef={elementRef}>
                <div
                    aria-label="Catalog items"
                    className={`nitro-catalog-air-mixed-grid ${gridClassName}`}
                    role="listbox"
                    style={{ ...airGridStyle, width: mixedLayout.width, minWidth: '100%', height: mixedLayout.height }}
                >
                    {mixedLayout.entries.map(({ offer, index, ...position }) => renderOfferTile(offer, index, position))}
                    {children}
                </div>
            </ClassicScrollAreaView>
        );
    }

    if (useVirtualGrid) {
        return (
            <div
                aria-label="Catalog items"
                className={`nitro-catalog-grid-virtual h-full min-h-0 ${gridClassName}`.trim()}
                role="listbox"
                style={
                    {
                        '--nitro-grid-column-min-height': `${effectiveColumnMinHeight}px`,
                        '--nitro-grid-column-min-width': `${effectiveColumnMinWidth}px`,
                        ...airGridStyle
                    } as CSSProperties
                }
            >
                <InfiniteGrid
                    classicScrollbar
                    airColumnAdmission={isAirStandardDensity}
                    columnGap={3}
                    columnCount={columnCount}
                    estimateSize={effectiveColumnMinHeight}
                    itemMinWidth={effectiveColumnMinWidth}
                    items={offers}
                    overscan={4}
                    rowGap={isAirStandardDensity ? 0 : 3}
                    onColumnCountChange={isAirStandardDensity ? setAirColumnCount : undefined}
                    itemRender={(offer, index) => (offer ? renderOfferTile(offer, index) : <></>)}
                />
                {children}
            </div>
        );
    }

    return (
        <ClassicScrollAreaView className="nitro-catalog-item-grid-scroll-area h-full min-h-0" viewportRef={elementRef}>
            <AutoGrid
                aria-label="Catalog items"
                className={gridClassName}
                columnCount={columnCount}
                columnMinHeight={effectiveColumnMinHeight}
                columnMinWidth={effectiveColumnMinWidth}
                fullHeight={false}
                overflow="visible"
                role="listbox"
                style={airGridStyle}
                {...rest}
            >
                {offers.length > 0 && offers.map((offer, index) => renderOfferTile(offer, index))}
                {children}
            </AutoGrid>
        </ClassicScrollAreaView>
    );
};