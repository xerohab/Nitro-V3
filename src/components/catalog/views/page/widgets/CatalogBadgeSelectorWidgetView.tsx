import { StringDataType } from '@nitrots/nitro-renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { AutoGridProps, LayoutBadgeImageView, LayoutGridItem } from '../../../../../common';
import { useCatalogData, useCatalogUiState, useInventoryBadges } from '../../../../../hooks';

interface CatalogBadgeSelectorWidgetViewProps extends AutoGridProps {}

const MAX_SEARCH_LENGTH = 40;

export const CatalogBadgeSelectorWidgetView: FC<CatalogBadgeSelectorWidgetViewProps> = (props) => {
    const { columnCount = 8, className = '', ...rest } = props;
    const [isVisible, setIsVisible] = useState(false);
    const [currentBadgeCode, setCurrentBadgeCode] = useState<string>(null);
    const [searchText, setSearchText] = useState('');
    const { currentOffer = null } = useCatalogData();
    const { setPurchaseOptions = null } = useCatalogUiState();
    const { badgeCodes = [], activate = null, deactivate = null } = useInventoryBadges();

    const excludedBadgeCodes = useMemo(
        () =>
            new Set(
                GetConfigurationValue<string>('badge.display.excluded.badgeCodes', '')
                    .split(',')
                    .map((badgeCode) => badgeCode.trim())
                    .filter(Boolean)
            ),
        []
    );

    const availableBadgeCodes = useMemo(() => badgeCodes.filter((badgeCode) => !excludedBadgeCodes.has(badgeCode)), [badgeCodes, excludedBadgeCodes]);
    const filteredBadgeCodes = useMemo(() => {
        const normalizedSearch = searchText.trim().toLocaleLowerCase();

        if (!normalizedSearch) return availableBadgeCodes;

        return availableBadgeCodes.filter((badgeCode) =>
            `${badgeCode} ${LocalizeBadgeName(badgeCode)} ${LocalizeBadgeDescription(badgeCode)}`.toLocaleLowerCase().includes(normalizedSearch)
        );
    }, [availableBadgeCodes, searchText]);

    const previewStuffData = useMemo(() => {
        if (!currentBadgeCode) return null;

        const stuffData = new StringDataType();

        stuffData.setValue(['0', currentBadgeCode, '', '']);

        return stuffData;
    }, [currentBadgeCode]);

    useEffect(() => {
        if (!currentOffer) return;

        setPurchaseOptions((prevValue) => {
            const newValue = { ...prevValue };

            newValue.extraParamRequired = true;
            newValue.extraData = (previewStuffData && previewStuffData.getValue(1)) || null;
            newValue.previewStuffData = previewStuffData;

            return newValue;
        });
    }, [currentOffer, previewStuffData, setPurchaseOptions]);

    useEffect(() => {
        if (!activate) return;

        const id = activate();

        return () => deactivate?.(id);
    }, [activate, deactivate]);

    useEffect(() => {
        if (!currentBadgeCode || availableBadgeCodes.includes(currentBadgeCode)) return;

        setCurrentBadgeCode(null);
    }, [availableBadgeCodes, currentBadgeCode]);

    useEffect(() => {
        if (!currentBadgeCode || filteredBadgeCodes.includes(currentBadgeCode)) return;

        setCurrentBadgeCode(null);
    }, [currentBadgeCode, filteredBadgeCodes]);

    return (
        <div className={`grid grid-cols-8 gap-1.5 w-full nitro-catalog-badge-selector-grid ${className}`.trim()}>
            {badgeCodes &&
                badgeCodes.length > 0 &&
                badgeCodes.map((badgeCode, index) => {
                    return (
                        <div key={index} className="w-full h-[70px] flex items-center justify-center p-0.5">
                            <LayoutGridItem
                                className="w-full h-full flex items-center justify-center rounded-lg bg-[#12100e] border border-[#d49400]/30 hover:border-[#ffb800] cursor-pointer"
                                itemActive={currentBadgeCode === badgeCode}
                                onClick={() => setCurrentBadgeCode(badgeCode)}
                            >
                                <LayoutBadgeImageView badgeCode={badgeCode} />
                            </LayoutGridItem>
                        </div>
                    );
                })}
        </div>
    );
};