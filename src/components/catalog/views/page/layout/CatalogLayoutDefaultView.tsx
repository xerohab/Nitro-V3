import { FC } from 'react';
import { GetConfigurationValue, LocalizeText, ProductTypeEnum, SanitizeHtml } from '../../../../../api';
import { Text } from '../../../../../common';
import { getCatalogGridMetrics, useCatalogData, useCatalogDisplayPreferences } from '../../../../../hooks';
import { CatalogHeaderView } from '../../catalog-header/CatalogHeaderView';
import { CatalogAddOnBadgeWidgetView } from '../widgets/CatalogAddOnBadgeWidgetView';
import { CatalogItemGridWidgetView } from '../widgets/CatalogItemGridWidgetView';
import { CatalogLimitedItemWidgetView } from '../widgets/CatalogLimitedItemWidgetView';
import { CatalogPreviewControls } from '../widgets/CatalogPreviewControls';
import { CatalogProductDetailsView } from '../widgets/CatalogProductDetailsView';
import { CatalogPurchaseWidgetView } from '../widgets/CatalogPurchaseWidgetView';
import { CatalogSpinnerWidgetView } from '../widgets/CatalogSpinnerWidgetView';
import { CatalogTotalPriceWidget } from '../widgets/CatalogTotalPriceWidget';
import { CatalogViewProductWidgetView } from '../widgets/CatalogViewProductWidgetView';
import { CatalogLayoutProps } from './CatalogLayout.types';

export const CatalogLayoutDefaultView: FC<CatalogLayoutProps> = (props) => {
    const { page = null } = props;
    const { currentOffer = null, currentPage = null, searchResult = null, roomPreviewer = null } = useCatalogData();
    const { density = 'standard', showTilePrices = true } = useCatalogDisplayPreferences();
    const gridMetrics = getCatalogGridMetrics(density);

    return (
        <div className="octane-catalog-default-layout flex flex-col h-full w-full gap-2 overflow-hidden flex-1 min-w-0">
            {/* TOP PANEL: Room Stage & Purchase Panel */}
            <div className="octane-catalog-product-view w-full h-[220px] min-h-[220px] max-h-[220px] shrink-0 flex gap-2 p-2 rounded-xl bg-[#1e1b18] border border-[#d49400]/40 box-border">
                {currentOffer ? (
                    <>
                        {/* Left Stage (68% Width for wide room preview) */}
                        <div className="octane-catalog-offer-preview relative w-[68%] h-full flex items-center justify-center rounded-lg bg-[#12100e] border border-[#2e2822] overflow-hidden">
                            <CatalogProductDetailsView offer={currentOffer} />
                            <CatalogLimitedItemWidgetView />

                            {currentOffer.product?.productType !== ProductTypeEnum.BADGE ? (
                                <>
                                    <CatalogPreviewControls productType={currentOffer.product?.productType} roomPreviewer={roomPreviewer} />
                                    <CatalogViewProductWidgetView />
                                    <CatalogAddOnBadgeWidgetView className="bg-muted rounded bottom-1 right-1 absolute" />
                                </>
                            ) : (
                                <CatalogAddOnBadgeWidgetView className="scale-200" />
                            )}
                        </div>

                        {/* Right Details Card (32% Width) */}
                        <div className="octane-catalog-offer-details w-[32%] h-full flex flex-col justify-between p-3 rounded-lg bg-[#151311] border border-[#2e2822] box-border overflow-hidden">
                            {/* Title & Price */}
                            <div className="flex flex-col gap-1 overflow-hidden">
                                <h3 className="text-[14px] font-bold text-[#ffb800] truncate">
                                    {currentOffer.localizationName || currentOffer.product?.furnitureData?.name || ''}
                                </h3>

                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-[10px] font-bold text-[#ffb800] uppercase">
                                        {LocalizeText('catalog.bundlewidget.price')}:
                                    </span>
                                    <CatalogTotalPriceWidget />
                                </div>
                            </div>

                            {/* Bottom Actions Stack */}
                            <div className="flex flex-col gap-2 w-full mt-auto pt-2 border-t border-[#2e2822]">
                                {/* Qty Row */}
                                <div className="octane-catalog-desktop-quantity-row flex items-center justify-between w-full">
                                    <span className="octane-catalog-desktop-quantity-label text-[11px] font-bold text-white shrink-0">
                                        Qty
                                    </span>

                                    <div className="octane-catalog-spinner-box octane-catalog-desktop-spinner-slot">
                                        <CatalogSpinnerWidgetView />
                                    </div>
                                </div>

                                {/* Stacked Buy & Gift Buttons */}
                                <div className="octane-catalog-offer-actions flex flex-col w-full">
                                    <CatalogPurchaseWidgetView />
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="octane-catalog-welcome flex items-center gap-3 h-full px-3 w-full">
                        {!!page?.localization?.getImage(1) && (
                            <img
                                alt=""
                                className="w-[70px] h-[70px] object-contain rounded shrink-0"
                                src={page.localization.getImage(1)}
                            />
                        )}

                        <Text
                            className="text-[11px]! text-[#ffb800]!"
                            dangerouslySetInnerHTML={{ __html: SanitizeHtml(page?.localization?.getText(0) ?? '') }}
                        />
                    </div>
                )}
            </div>

            {/* BOTTOM PANEL: 8-Column Grid Shell */}
            <div className="octane-catalog-grid-shell flex-1 min-h-0 w-full overflow-y-auto p-2 rounded-xl bg-[#1e1b18] border border-[#d49400]/40">
                {GetConfigurationValue('catalog.headers') && !searchResult && (
                    <CatalogHeaderView imageUrl={currentPage?.localization?.getImage(0)} />
                )}

                <CatalogItemGridWidgetView
                    className={`octane-catalog-grid octane-catalog-grid-density-${density} w-full`}
                    showPrices={showTilePrices}
                    {...gridMetrics}
                    columnCount={8}
                    columnMinWidth={0}
                />
            </div>
        </div>
    );
};
