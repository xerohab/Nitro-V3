import { GetSessionDataManager } from '@octane/renderer';
import { ChangeEvent, FC, KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import { FaSearch, FaTimes } from 'react-icons/fa';
import {
    CatalogPage,
    FilterCatalogNode,
    FurnitureOffer,
    ICatalogNode,
    IPurchasableOffer,
    LocalizeText,
    localizeWithFallback,
    PageLocalization,
    SearchResult
} from '../../../../../api';
import { useCatalogData, useCatalogUiState } from '../../../../../hooks';
import {
    CATALOG_SEARCH_DEBOUNCE_MS,
    findCatalogFurnitureMatches,
    isCatalogSearchEnterKey,
    normalizeCatalogSearchText,
    shouldRunCatalogSearch
} from './catalogSearch.helpers';
import { getCatalogSearchOfferTarget } from './catalogSearchOfferMap.generated';

export const CatalogSearchView: FC<{}> = () => {
    const [searchValue, setSearchValue] = useState('');
    const searchTimeout = useRef<ReturnType<typeof setTimeout>>(null);
    const { rootNode = null } = useCatalogData();
    const { currentType = null, setSearchResult = null, setCurrentPage = null, setCurrentOffer = null } = useCatalogUiState();

    const runSearch = useCallback(
        (search: string) => {
            if (!rootNode || !shouldRunCatalogSearch(search)) return;

            const furnitureDatas = GetSessionDataManager().getAllFurnitureData();

            if (!furnitureDatas || !furnitureDatas.length) return;

            const { furniture: foundFurniture, furniLines: foundFurniLines } = findCatalogFurnitureMatches(furnitureDatas, search, currentType);

            const offers: IPurchasableOffer[] = [];

            for (const furniture of foundFurniture) {
                const target = getCatalogSearchOfferTarget(furniture.id);

                // Only expose items that can be resolved to a real catalogue offer.
                // FurnitureData ids are furniture/class ids and are NOT safe purchase ids.
                if (!target) continue;

                const offer = new FurnitureOffer(furniture);

                Object.defineProperty(offer, 'offerId', {
                    value: target.offerId,
                    writable: true,
                    configurable: true
                });

                // Search pages are virtual, so retain the exact real page/offer pair
                // used by the server when PurchaseFromCatalogComposer is sent.
                Object.defineProperty(offer, '__searchCatalogOfferId', {
                    value: target.offerId,
                    writable: true,
                    configurable: true
                });
                Object.defineProperty(offer, '__searchCatalogPageId', {
                    value: target.pageId,
                    writable: true,
                    configurable: true
                });

                offers.push(offer);
            }

            let nodes: ICatalogNode[] = [];

            FilterCatalogNode(search, foundFurniLines, rootNode, nodes);

            setSearchResult(
                new SearchResult(
                    search,
                    offers,
                    nodes.filter((node) => node.isVisible)
                )
            );
            setCurrentPage(
                new CatalogPage(
                    -1,
                    'default_3x3',
                    new PageLocalization([], [LocalizeText('catalog.search.results', ['count', 'needle'], [String(offers.length), search])]),
                    offers,
                    false,
                    1
                )
            );

            // Select once for a new search. Subsequent clicks must not be overwritten.
            //
            // Search offers begin as lazy FurnitureOffer instances. Selecting one
            // directly is not enough because FurnitureOffer reports
            // bundlePurchaseAllowed=false until ProductOfferEvent returns the
            // real catalogue Offer.
            //
            // Activate the first result immediately so its real price,
            // giftability, haveOffer and bundlePurchaseAllowed values replace
            // the temporary search offer.
            const firstOffer = offers.length > 0 ? offers[0] : null;

            setCurrentOffer?.(firstOffer);

            if (firstOffer?.isLazy && firstOffer.offerId > -1) {
                firstOffer.activate();
            }
        },
        [currentType, rootNode, setCurrentPage, setSearchResult, setCurrentOffer]
    );

    const scheduleSearch = useCallback(
        (value: string, immediate = false) => {
            if (searchTimeout.current) clearTimeout(searchTimeout.current);

            const search = normalizeCatalogSearchText(value);

            if (!shouldRunCatalogSearch(search)) {
                setSearchResult(null);

                return;
            }

            if (immediate) {
                runSearch(search);

                return;
            }

            searchTimeout.current = setTimeout(() => runSearch(search), CATALOG_SEARCH_DEBOUNCE_MS);
        },
        [runSearch, setSearchResult]
    );

    const onSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;

        setSearchValue(value);
        scheduleSearch(value);
    };

    const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (!isCatalogSearchEnterKey(event.key, searchValue)) return;

        event.preventDefault();
        scheduleSearch(searchValue, true);
    };

    const clearSearch = () => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        setSearchValue('');
        setSearchResult(null);
    };

    useEffect(() => {
        if (searchValue) scheduleSearch(searchValue);
    }, [currentType, rootNode]);

    useEffect(() => () => searchTimeout.current && clearTimeout(searchTimeout.current), []);

    return (
        <div className="relative w-full">
            <FaSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] text-muted pointer-events-none" />
            <input
                aria-label={LocalizeText('generic.search')}
                className="w-full pl-6 pr-6 py-[3px] text-[11px] rounded border-2 border-card-grid-item-border bg-white text-dark placeholder-muted focus:outline-none focus:border-primary transition-colors"
                placeholder={LocalizeText('generic.search')}
                type="text"
                value={searchValue}
                onChange={onSearchChange}
                onKeyDown={onSearchKeyDown}
            />
            {searchValue && searchValue.length > 0 && (
                <button
                    aria-label={localizeWithFallback('generic.clear', 'Clear')}
                    type="button"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-muted hover:text-danger cursor-pointer transition-colors"
                    onClick={clearSearch}
                >
                    <FaTimes />
                </button>
            )}
        </div>
    );
};
