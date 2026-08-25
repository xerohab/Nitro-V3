import { FC } from 'react';
import { CatalogType, GetConfigurationValue, LocalizeText, ProductTypeEnum, SanitizeHtml } from '../../../../../api';
import { Text } from '../../../../../common';
import { getCatalogGridMetrics, useCatalogData, useCatalogDisplayPreferences, useCatalogUiState } from '../../../../../hooks';
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
        <div className="nitro-catalog-default-layout flex flex-col h-full w-full gap-2 overflow-hidden flex-1 min-w-0">
            
            {/* TOP PANEL: Preview & Action Controls */}
            <div className="nitro-catalog-product-view w-full h-[220px] min-h-[220px] max-h-[220px] shrink-0 flex gap-2 p-2.5 rounded-xl bg-[#1e1b18] border border-[#d49400]/40 box-border">
                {currentOffer ? (
                    <>
                        {/* Left: Room Stage */}
                        <div className="nitro-catalog-offer-preview relative w-[50%] h-full flex items-center justify-center rounded-lg bg-[#12100e] border border-[#2e2822] overflow-hidden">
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

                        {/* Right: Controls & Purchase Panel */}
                        <div className="nitro-catalog-offer-details w-[50%] h-full flex flex-col justify-between p-3 rounded-lg bg-[#151311] border border-[#2e2822] box-border">
                            <div>
                                <h3 className="text-[15px] font-bold text-[#ffb800]! truncate mb-1">
                                    {currentOffer.localizationName || currentOffer.product?.furnitureData?.name || ''}
                                </h3>
                                <div className="flex items-center gap-1.5 mb-2">
                                    <span className="text-[11px] font-bold text-[#ffb800]! uppercase">{LocalizeText('catalog.bundlewidget.price')}:</span>
                                    <CatalogTotalPriceWidget />
                                </div>
                            </div>

                            {/* INLINE ROW: Stepper + Buy Buttons */}
                            <div className="flex items-center justify-between gap-2 w-full pt-1">
                                <div className="nitro-catalog-spinner-box flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#1e1b18] border border-[#d49400]/30">
                                    <span className="text-[10px] font-bold text-[#ffb800]! shrink-0">Qty</span>
                                    <CatalogSpinnerWidgetView />
                                </div>

                                <div className="nitro-catalog-offer-actions flex items-center gap-1.5 shrink-0">
                                    <CatalogPurchaseWidgetView />
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="nitro-catalog-welcome flex items-center gap-3 h-full px-3 w-full">
                        {!!page?.localization?.getImage(1) && (
                            <img alt="" className="w-[70px] h-[70px] object-contain rounded shrink-0" src={page.localization.getImage(1)} />
                        )}
                        <Text className="text-[11px]! text-[#ffb800]!" dangerouslySetInnerHTML={{ __html: SanitizeHtml(page?.localization?.getText(0) ?? '') }} />
                    </div>
                )}
            </div>

            {/* BOTTOM PANEL: 8-Column Grid Shell */}
            <div className="nitro-catalog-grid-shell flex-1 min-h-0 w-full overflow-y-auto p-2 rounded-xl bg-[#1e1b18] border border-[#d49400]/40">
                {GetConfigurationValue('catalog.headers') && !searchResult && (
                    <CatalogHeaderView imageUrl={currentPage?.localization?.getImage(0)} />
                )}
                <CatalogItemGridWidgetView
                    className={`nitro-catalog-grid nitro-catalog-grid-density-${density} w-full`}
                    showPrices={showTilePrices}
                    {...gridMetrics}
                    columnCount={8}
                    columnMinWidth={0}
                />
            </div>

        </div>
    );
};