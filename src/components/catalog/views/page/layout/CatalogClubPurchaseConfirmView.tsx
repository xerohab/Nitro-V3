import { ClubOfferData } from '@nitrots/nitro-renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { GetConfigurationValue, LocalizeText } from '../../../../../api';
import { LayoutCurrencyIcon, NitroCardContentView, NitroCardHeaderView, NitroCardView } from '../../../../../common';

interface CatalogClubPurchaseConfirmViewProps {
    offer: ClubOfferData;
    productText: string;
    validUntilText: string;
    onCancel: () => void;
    onConfirm: () => void;
}

export const CatalogClubPurchaseConfirmView: FC<CatalogClubPurchaseConfirmViewProps> = (props) => {
    const { offer, productText, validUntilText, onCancel, onConfirm } = props;
    const disclaimerEnabled = useMemo(() => GetConfigurationValue<boolean>('disclaimer.credit_spending.enabled', false), []);
    const [disclaimerAccepted, setDisclaimerAccepted] = useState(!disclaimerEnabled);
    const showCredits = offer.priceCredits > 0 || offer.priceActivityPoints <= 0;

    useEffect(() => setDisclaimerAccepted(!disclaimerEnabled), [disclaimerEnabled, offer.offerId]);

    const title = LocalizeText('catalog.club.buy.confirm');

    return (
        <NitroCardView
            aria-label={title}
            aria-modal="true"
            classNames={['nitro-club-purchase-confirm']}
            frameStyle={3}
            isResizable={false}
            role="dialog"
            theme="primary-slim"
        >
            <NitroCardHeaderView headerText={title} onCloseClick={onCancel} />
            <NitroCardContentView
                classNames={['nitro-club-purchase-confirm-content', disclaimerEnabled ? 'has-disclaimer' : ''].filter(Boolean)}
                overflow="hidden"
            >
                <div className="nitro-club-purchase-confirm-product">
                    <span aria-hidden="true" className="nitro-club-purchase-confirm-icon" />
                    <div className="nitro-club-purchase-confirm-copy">
                        <strong>{productText}</strong>
                        <span>{validUntilText}</span>
                        <div className="nitro-club-purchase-confirm-cost-row">
                            <span>{LocalizeText('catalog.purchase.confirmation.dialog.cost')}</span>
                            <span className="nitro-club-purchase-confirm-price">
                                {showCredits && (
                                    <span className="nitro-club-purchase-confirm-price-part" data-currency-type="-1">
                                        <strong>{offer.priceCredits}</strong>
                                        <LayoutCurrencyIcon type={-1} />
                                    </span>
                                )}
                                {offer.priceActivityPoints > 0 && (
                                    <span className="nitro-club-purchase-confirm-price-part" data-currency-type={offer.priceActivityPointsType}>
                                        <strong>{`${offer.priceCredits > 0 ? '+ ' : ''}${offer.priceActivityPoints}`}</strong>
                                        <LayoutCurrencyIcon type={offer.priceActivityPointsType} />
                                    </span>
                                )}
                            </span>
                        </div>
                    </div>
                </div>

                {disclaimerEnabled && (
                    <label className="nitro-club-purchase-confirm-disclaimer">
                        <input checked={disclaimerAccepted} type="checkbox" onChange={(event) => setDisclaimerAccepted(event.target.checked)} />
                        <span>{LocalizeText('disclaimer.credit_spending')}</span>
                    </label>
                )}

                <div className="nitro-club-purchase-confirm-actions">
                    <button className="nitro-club-purchase-confirm-cancel" type="button" onClick={onCancel}>
                        {LocalizeText('cancel')}
                    </button>
                    <button className="nitro-club-purchase-confirm-submit" disabled={!disclaimerAccepted} type="button" onClick={onConfirm}>
                        {LocalizeText('catalog.club.buy.subscribe')}
                    </button>
                </div>
            </NitroCardContentView>
        </NitroCardView>
    );
};
