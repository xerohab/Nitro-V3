import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@nitrots/nitro-renderer';
import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { FaBars, FaCog } from 'react-icons/fa';
import { CatalogType, GetConfigurationValue, LocalizeShortNumber, LocalizeText, SanitizeHtml } from '../../api';
import { LayoutCurrencyIcon, NitroCardContentView, NitroCardHeaderView, NitroCardTabsItemView, NitroCardTabsView, NitroCardView } from '../../common';
import { useCatalogActions, useCatalogData, useCatalogUiState, useHasPermission, usePurse } from '../../hooks';
import { CatalogAdminProvider, useCatalogAdmin } from './CatalogAdminContext';
import { parseCatalogTabLabel, useCatalogWindowWidth } from './useCatalogWindowWidth';
import { CatalogAdminManagerView } from './views/admin/CatalogAdminManagerView';
import { CatalogAdminOfferEditView } from './views/admin/CatalogAdminOfferEditView';
import { CatalogAdminPageEditView } from './views/admin/CatalogAdminPageEditView';
import { CatalogBuildersClubStatusView } from './views/catalog-header/CatalogBuildersClubStatusView';
import { CatalogIconView } from './views/catalog-icon/CatalogIconView';
import { CatalogGiftView } from './views/gift/CatalogGiftView';
import { CatalogBreadcrumbView } from './views/navigation/CatalogBreadcrumbView';
import { CatalogNavigationView } from './views/navigation/CatalogNavigationView';
import { CatalogSearchView } from './views/page/common/CatalogSearchView';
import { GetCatalogLayout } from './views/page/layout/GetCatalogLayout';
import { MarketplacePostOfferView } from './views/page/layout/marketplace/MarketplacePostOfferView';

const CatalogViewInner: FC<{}> = () => {
    const { rootNode = null, currentPage = null, searchResult = null } = useCatalogData();
    const {
        isVisible = false,
        setIsVisible = null,
        navigationHidden = false,
        setNavigationHidden = null,
        activeNodes = [],
        setSearchResult = null,
        currentType = CatalogType.NORMAL
    } = useCatalogUiState();
    const { openPageByName = null, openPageByOfferId = null, activateNode = null, openCatalogByType = null, toggleCatalogByType = null } = useCatalogActions();
    const catalogAdmin = useCatalogAdmin();
    const adminMode = catalogAdmin?.adminMode ?? false;
    const setAdminMode = catalogAdmin?.setAdminMode ?? (() => {});

    const isMod = useHasPermission('acc_catalogfurni');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { purse = null } = usePurse();
    const displayedCurrencies = GetConfigurationValue<number[]>('system.currency.types', []);
    const activeCatalogNode = activeNodes?.[activeNodes.length - 1] ?? null;
    const buildersClubEnabled = GetConfigurationValue<boolean>('buildersclub.enabled', GetConfigurationValue<boolean>('toolbar.buildersclub.enabled', true));
    
    const stripSwfTabSuffix = (label: string) => (label || '').replace(/\s*\(\D[^)]*\)\s*$/g, '').trim();
    const getSwfTabLabel = (label: string) => stripSwfTabSuffix(parseCatalogTabLabel(label).name);
    const tabsShellRef = useRef<HTMLDivElement>(null);

    const visibleRootTabCount = useMemo(() => {
        if (!rootNode?.children?.length) return 0;

        return rootNode.children.filter((child, index) => {
            if (!child.isVisible) return false;
            if (index === 0 && getSwfTabLabel(child.localization).toLowerCase().includes('rari')) return false;

            return true;
        }).length;
    }, [rootNode]);

    const catalogWindowStyle = useCatalogWindowWidth(
        tabsShellRef,
        isVisible,
        visibleRootTabCount,
        adminMode,
        isMod,
        currentType,
        rootNode?.pageId,
        activeCatalogNode?.pageId
    );

    useEffect(() => {
        const getCatalogTypeFromLink = (type?: string) => {
            switch ((type || '').toLowerCase()) {
                case 'bc':
                case 'builder':
                case 'buildersclub':
                case 'builders_club':
                    return buildersClubEnabled ? CatalogType.BUILDER : CatalogType.NORMAL;
                default:
                    return CatalogType.NORMAL;
            }
        };

        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'show':
                        if (parts.length > 2) {
                            openCatalogByType(getCatalogTypeFromLink(parts[2]));
                            return;
                        }
                        setIsVisible(true);
                        return;
                    case 'hide':
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        if (parts.length > 2) {
                            toggleCatalogByType(getCatalogTypeFromLink(parts[2]));
                            return;
                        }
                        setIsVisible((prevValue) => !prevValue);
                        return;
                    case 'open':
                        if (parts.length > 2) {
                            if (parts.length === 4) {
                                switch (parts[2]) {
                                    case 'offerId':
                                        openPageByOfferId(parseInt(parts[3]));
                                        return;
                                }
                            } else {
                                openPageByName(parts[2]);
                            }
                        } else {
                            setIsVisible(true);
                        }
                        return;
                }
            },
            eventUrlPrefix: 'catalog/'
        };

        AddLinkEventTracker(linkTracker);
        return () => RemoveLinkEventTracker(linkTracker);
    }, [setIsVisible, openPageByOfferId, openPageByName, openCatalogByType, toggleCatalogByType, buildersClubEnabled]);

    return (
        <>
            {/* Ultra-aggressive resets to strip layouts and force buy buttons into view */}
            <style dangerouslySetInnerHTML={{__html: `
                .nitro-catalog-window {
                    width: 980px !important;
                    min-width: 980px !important;
                    max-width: 980px !important;
                    height: 635px !important;
                    min-height: 635px !important;
                    max-height: 635px !important;
                }
                .nitro-catalog-navigation-shell {
                    width: 320px !important;
                    min-width: 320px !important;
                    max-width: 320px !important;
                }
                .nitro-catalog-layout-shell-container {
                    flex: 1 1 0% !important;
                    width: auto !important;
                }
                
                /* Typography layout settings rule alignment */
                .nitro-catalog-window, 
                .nitro-catalog-navigation-shell, 
                .nitro-catalog-navigation-shell *, 
                .nitro-catalog-layout-shell-container *,
                .nitro-catalog-window span,
                .nitro-catalog-window div {
                    font-family: "Ubuntu", "Segoe UI", "Arial", sans-serif !important;
                    font-weight: 400 !important;
                    font-style: normal !important;
                    text-transform: none !important;
                    letter-spacing: normal !important;
                }

                /* FORCE RESET: Targets all parent wrapper nodes inside dynamic layout files to limit their heights */
                .nitro-catalog-layout-shell-container [class*="layout-"],
                .nitro-catalog-layout-shell-container [class*="layout-"] > div {
                    max-height: 480px !important;
                }

                /* Shrink the room view layout widget box completely */
                .catalog-workspace-wrapper [class*="catalog-room-preview"],
                .catalog-workspace-wrapper [class*="room-canvas"],
                .catalog-workspace-wrapper [class*="layout-room-preview"],
                .catalog-workspace-wrapper [class*="-preview-container"],
                .catalog-workspace-wrapper .layout-room-preview,
                .catalog-workspace-wrapper .room-preview-container,
                .catalog-workspace-wrapper img[class*="preview"],
                .catalog-workspace-wrapper [class*="nitro-catalog-layout-hero"] {
                    max-height: 100px !important;
                    height: 100px !important;
                    min-height: 100px !important;
                }
                
                .catalog-workspace-wrapper [class*="room-canvas"] canvas,
                .catalog-workspace-wrapper .room-preview-container canvas {
                    max-height: 100px !important;
                    height: 100px !important;
                    min-height: 100px !important;
                }
            `}} />

            {isVisible && (
                <NitroCardView
                    classNames={['nitro-catalog-window']}
                    dragStyle={{ ...catalogWindowStyle, width: '980px', height: '660px' }}
                    isResizable={false}
                    style={{ ...catalogWindowStyle, width: '980px', height: '660px' }}
                    uniqueKey="catalog"
                >
                    <NitroCardHeaderView
                        className={currentType === CatalogType.BUILDER ? 'builders-club-card-header' : ''}
                        headerText="Shop"
                        onCloseClick={() => setIsVisible(false)}
                    />
                    
                    {adminMode && (
                        <div className="bg-[#ffc107] text-black font-semibold text-[11px] px-3 py-1 flex justify-between items-center tracking-wide select-none uppercase border-b border-black/10">
                            <div>?? Admin Mode</div>
                            <button className="bg-[#28a745] text-white px-2 py-0.5 rounded shadow text-[10px] font-bold flex items-center gap-1 hover:bg-[#218838]">
                                ? Publish
                            </button>
                        </div>
                    )}

                    <div className="nitro-catalog-mobile-header">
                        {isMod && (
                            <div className="nitro-catalog-mobile-burger">
                                <button className="nitro-catalog-burger-btn" onClick={() => setMobileMenuOpen((value) => !value)}>
                                    <FaBars />
                                </button>
                                {mobileMenuOpen && (
                                    <div className="nitro-catalog-burger-menu">
                                        <button
                                            onClick={() => {
                                                setAdminMode(!adminMode);
                                                setMobileMenuOpen(false);
                                            }}
                                        >
                                            {adminMode ? 'Exit Admin' : 'Admin'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="nitro-catalog-mobile-currency">
                            <div className="nitro-catalog-coin">
                                <span>{LocalizeShortNumber(purse?.credits ?? 0)}</span>
                                <LayoutCurrencyIcon type={-1} />
                            </div>
                            {displayedCurrencies.map((type) => (
                                <div key={type} className="nitro-catalog-coin">
                                    <span>{LocalizeShortNumber(purse?.activityPoints?.get(type) ?? 0)}</span>
                                    <LayoutCurrencyIcon type={type} />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-1 flex-col w-full min-h-0 overflow-hidden bg-[#e3e3e3]">
                        <NitroCardContentView classNames={['flex-1 flex flex-col min-h-0 p-3 overflow-hidden']}>
                            <CatalogBuildersClubStatusView />
                            
                            {/* Horizontal Tab Categories Row */}
                            <div className="w-full flex items-end justify-between pb-0.5 shrink-0" ref={tabsShellRef}>
                                <div className="flex items-center gap-1 overflow-x-auto overflow-y-hidden">
                                    {rootNode && rootNode.children.length > 0 && rootNode.children.map((child, index) => {
                                        if (!child.isVisible) return null;
                                        if (index === 0 && getSwfTabLabel(child.localization).toLowerCase().includes('rari')) return null;

                                        return (
                                            <button
                                                key={`${child.pageId}-${child.pageName}-${index}`}
                                                className={`min-w-[76px] px-2 py-1 flex flex-col items-center justify-center rounded-t-xl border-t border-x transition-all shrink-0 gap-0.5 ${
                                                    child.isActive 
                                                    ? 'bg-white border-gray-400 shadow-sm relative z-10' 
                                                    : 'bg-[#f4f4f4]/90 border-transparent hover:bg-white/50'
                                                }`}
                                                onClick={() => {
                                                    if (searchResult) setSearchResult(null);
                                                    activateNode(child);
                                                }}
                                            >
                                                <CatalogIconView icon={child.iconId > 0 ? child.iconId : 1} className="w-[24px] h-[24px] object-contain" />
                                                <span className="text-[10px] text-gray-700 text-center truncate max-w-[84px] leading-none">
                                                    {getSwfTabLabel(child.localization)}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="flex items-center gap-3 pb-1 shrink-0">
                                    {isMod && (
                                        <button 
                                            className={`px-3 py-1.5 flex items-center justify-center rounded-t-xl border-t border-x transition-all shrink-0 gap-1 ${adminMode ? 'bg-amber-100 border-amber-400 !text-black' : 'bg-[#f4f4f4] border-transparent text-gray-400'}`}
                                            onClick={() => setAdminMode(!adminMode)}
                                        >
                                            <FaCog className={`text-[12px] ${adminMode ? 'animate-spin' : 'text-gray-600'}`} style={adminMode ? { animationDuration: '3s' } : {}} />
                                            <span className="text-[10px] font-semibold">Admin</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="w-full bg-[#fcfcfc] p-3 border-t border-x border-gray-300 shrink-0">
                                <CatalogSearchView />
                            </div>

                            {/* Split content layout staging environment container */}
                            <div className="catalog-workspace-wrapper flex flex-1 w-full min-h-0 overflow-hidden bg-white border border-gray-300 rounded-b-lg">
                                {!navigationHidden && activeNodes && activeNodes.length > 0 && (
                                    <div className="w-[320px] h-full border-r flex flex-col min-h-0 shrink-0 overflow-y-auto overflow-x-hidden p-2 nitro-catalog-navigation-shell" style={{ backgroundColor: '#fbfbfb', borderColor: '#d4d4d8' }}>
                                        <CatalogNavigationView node={activeNodes[0]} />
                                    </div>
                                )}

                                <div className="flex-1 h-full flex flex-col min-h-0 overflow-y-auto p-2 pb-1 relative nitro-catalog-layout-shell-container" style={{ backgroundColor: '#ffffff' }}>
                                    <div className="w-full flex flex-col gap-1.5">
                                        <CatalogBreadcrumbView />
                                        {GetCatalogLayout(currentPage, () => setNavigationHidden(true))}
                                    </div>
                                </div>
                            </div>
                        </NitroCardContentView>
                    </div>

                </NitroCardView>
            )}
            <CatalogAdminManagerView />
            <CatalogAdminPageEditView />
            <CatalogAdminOfferEditView />
            <CatalogGiftView />
            <MarketplacePostOfferView />
        </>
    );
};

export const CatalogView: FC<{}> = () => {
    const { catalogLocalizationVersion = 0 } = useCatalogData();

    return (
        <CatalogAdminProvider>
            <div className="hidden" data-catalog-localization-version={catalogLocalizationVersion} />
            <CatalogViewInner />
        </CatalogAdminProvider>
    );
};