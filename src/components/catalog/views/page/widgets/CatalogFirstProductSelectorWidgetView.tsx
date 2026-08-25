import { FC, useEffect } from 'react';
import { useCatalogData, useCatalogActions } from '../../../../../hooks';

export const CatalogFirstProductSelectorWidgetView: FC<{}> = (props) => {
    const { currentPage = null, currentOffer = null, searchResult = null } = useCatalogData();
    const { selectCatalogOffer = null } = useCatalogActions();

    useEffect(() => {
        // Do NOT auto-select default page offers if a search is active
        if (searchResult && searchResult.offers && searchResult.offers.length > 0) return;

        if (!currentPage || !currentPage.offers || !currentPage.offers.length) return;

        // Only select the first offer if no offer is currently selected or if the selected offer isn't on this page
        if (!currentOffer || !currentPage.offers.includes(currentOffer)) {
            selectCatalogOffer?.(currentPage.offers[0]);
        }
    }, [currentPage, currentOffer, searchResult, selectCatalogOffer]);

    return null;
};