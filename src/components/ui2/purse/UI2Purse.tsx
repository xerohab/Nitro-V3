import { CreateLinkEvent } from '@octane/renderer';
import { FC } from 'react';
import { FriendlyTime } from '../../../api';
import { usePurse } from '../../../hooks/purse/usePurse';
import { useUI2 } from '../UI2Context';

import creditsIcon from '../../../assets/images/purse/air/credits.png';
import diamondIcon from '../../../assets/images/purse/air/diamond.png';
import ducketsIcon from '../../../assets/images/purse/air/duckets.png';
import hcLogo from '../../../assets/images/hc-center/hc_logo.gif';

export const UI2Purse: FC = () =>
{
    const {
        purseVisible,
        setPurseVisible,
        colour
    } = useUI2();

    const { purse = null, getCurrencyAmount } = usePurse();

    const currencies = [
        {
            key: 'credits',
            label: 'Credits',
            amount: getCurrencyAmount(-1),
            icon: creditsIcon
        },
        {
            key: 'duckets',
            label: 'Duckets',
            amount: getCurrencyAmount(0),
            icon: ducketsIcon
        },
        {
            key: 'diamonds',
            label: 'Diamonds',
            amount: getCurrencyAmount(5),
            icon: diamondIcon
        },
        {
            key: 'points',
            label: 'Points',
            amount: getCurrencyAmount(101),
            icon: diamondIcon
        }
    ];

    const getClubTime = () =>
    {
        if(!purse || purse.clubDays <= 0) return 'Get HC';

        if(purse.minutesUntilExpiration > -1 && purse.minutesUntilExpiration < (60 * 24))
        {
            return FriendlyTime.shortFormat(purse.minutesUntilExpiration * 60);
        }

        return FriendlyTime.shortFormat(((purse.clubPeriods * 31) + purse.clubDays) * 86400);
    };

    if(!purseVisible)
    {
        return (
            <button
                type="button"
                className="solace-ui2-purse-tab"
                style={{ '--solace-ui2-colour': colour } as React.CSSProperties}
                onClick={() => setPurseVisible(true)}
                title="Show purse"
                aria-label="Show purse"
            >
                <img
                    src={creditsIcon}
                    className="solace-ui2-purse-icon"
                    alt=""
                />
            </button>
        );
    }

    return (
        <div
            className="solace-ui2-purse solace-ui2-purse--classic"
            style={{ '--solace-ui2-colour': colour } as React.CSSProperties}
            role="region"
            aria-label="Purse"
        >
            <div className="solace-ui2-purse-top">
                <span className="solace-ui2-purse-brand">Purse</span>

                <button
                    type="button"
                    className="solace-ui2-purse-collapse"
                    onClick={() => setPurseVisible(false)}
                    title="Hide purse"
                    aria-label="Hide purse"
                >
                    ×
                </button>
            </div>

            <div className="solace-ui2-purse-currencies">
                {currencies.map(currency => (
                    <div
                        key={currency.key}
                        className={`solace-ui2-purse-item solace-ui2-purse-item--${currency.key}`}
                    >
                        <span className="solace-ui2-purse-item-icon-wrap">
                            <img
                                src={currency.icon}
                                className="solace-ui2-purse-icon"
                                alt=""
                            />
                        </span>

                        <span className="solace-ui2-purse-label">
                            {currency.label}
                        </span>

                        <strong className="solace-ui2-purse-amount">
                            {currency.amount}
                        </strong>
                    </div>
                ))}

                <button
                    type="button"
                    className="solace-ui2-purse-item solace-ui2-purse-hc"
                    onClick={() => CreateLinkEvent('habboUI/open/hccenter')}
                    title="Open HC Center"
                >
                    <span className="solace-ui2-purse-hc-logo">
                        <img src={hcLogo} alt="HC" draggable={false} />
                    </span>

                    <span className="solace-ui2-purse-label">
                        Habbo Club
                    </span>

                    <strong className="solace-ui2-purse-amount">
                        {getClubTime()}
                    </strong>

                    <span className="solace-ui2-purse-chevron">›</span>
                </button>
            </div>
        </div>
    );
};
