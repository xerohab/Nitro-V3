import { StringDataType } from '@nitrots/nitro-renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { AutoGridProps, LayoutBadgeImageView, LayoutGridItem } from '../../../../../common';
import { useCatalogData, useCatalogUiState, useInventoryBadges } from '../../../../../hooks';

const EXCLUDED_BADGE_CODES: string[] = [];

interface CatalogBadgeSelectorWidgetViewProps extends AutoGridProps {}

export const CatalogBadgeSelectorWidgetView: FC<CatalogBadgeSelectorWidgetViewProps> = (props) => {
    const { columnCount = 8, className = '', ...rest } = props;
    const [isVisible, setIsVisible] = useState(false);
    const [currentBadgeCode, setCurrentBadgeCode] = useState<string>(null);
    const { currentOffer = null } = useCatalogData();
    const { setPurchaseOptions = null } = useCatalogUiState();
    const { badgeCodes = [], activate = null, deactivate = null } = useInventoryBadges();

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
        if (!isVisible) return;

        const id = activate();

        return () => deactivate(id);
    }, [isVisible, activate, deactivate]);

    useEffect(() => {
        setIsVisible(true);

        return () => setIsVisible(false);
    }, []);

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