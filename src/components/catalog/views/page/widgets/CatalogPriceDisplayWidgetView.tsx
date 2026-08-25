import { FC } from 'react';
import { IPurchasableOffer } from '../../../../../api';
import { getCatalogBundlePrice, ICatalogBundlePrice } from '../../../../../api/catalog/CatalogBundleDiscount';
import { LayoutCurrencyIcon, Text } from '../../../../../common';
import { useCatalogBundleDiscountRuleset, useCatalogUiState } from '../../../../../hooks';

interface CatalogPriceDisplayWidgetViewProps {
    offer: IPurchasableOffer;
    separator?: boolean;
}

export const CatalogPriceDisplayWidgetView: FC<CatalogPriceDisplayWidgetViewProps> = (props) => {
    const { offer = null, separator = false } = props;
    const { purchaseOptions = null } = useCatalogUiState();
    const { data: bundleDiscountRuleset = null } = useCatalogBundleDiscountRuleset();
    const { quantity = 1 } = purchaseOptions;

    if (!offer) return null;

    const credits = getCatalogBundlePrice(offer.priceInCredits, quantity, offer.bundlePurchaseAllowed, bundleDiscountRuleset);
    const activityPoints = getCatalogBundlePrice(offer.priceInActivityPoints, quantity, offer.bundlePurchaseAllowed, bundleDiscountRuleset);

    const Price = ({ price }: { price: ICatalogBundlePrice }) => (
        <>
            {price.hasDiscount && <Text className="nitro-catalog-standard-price-original">{price.originalPrice}</Text>}
            <Text className="nitro-catalog-standard-price-text">{price.price}</Text>
        </>
    );

    return (
        <div className="nitro-catalog-standard-price-display">
            {offer.priceInCredits > 0 && (
                <div className="nitro-catalog-standard-price-pill is-credits" data-currency-type="-1">
                    <Price price={credits} />
                    <LayoutCurrencyIcon type={-1} />
                </div>
            )}
            {separator && offer.priceInCredits > 0 && offer.priceInActivityPoints > 0 && <Text className="nitro-catalog-standard-price-plus">+</Text>}
            {offer.priceInActivityPoints > 0 && (
                <div className="nitro-catalog-standard-price-pill is-activity-points" data-currency-type={offer.activityPointType}>
                    <Price price={activityPoints} />
                    <LayoutCurrencyIcon type={offer.activityPointType} />
                </div>
            )}
        </div>
    );
};
