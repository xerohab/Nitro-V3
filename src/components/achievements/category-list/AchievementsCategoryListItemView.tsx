import { CSSProperties, Dispatch, FC, SetStateAction } from 'react';
import { AchievementUtilities, IAchievementCategory, LocalizeText } from '../../../api';

interface AchievementCategoryListItemViewProps {
    category: IAchievementCategory;
    selectedCategoryCode: string;
    setSelectedCategoryCode: Dispatch<SetStateAction<string>>;
}

export const AchievementsCategoryListItemView: FC<AchievementCategoryListItemViewProps> = (props) => {
    const { category = null, selectedCategoryCode = null, setSelectedCategoryCode = null } = props;

    if (!category) {
        return (
            <div
                className="air-achievements-category-tile air-achievements-category-tile--empty"
                style={{
                    backgroundImage: `url(${AchievementUtilities.getAchievementImageUrl('achievement_category_bkg_empty_3')})`
                }}
                aria-hidden="true"
            />
        );
    }

    const progress = AchievementUtilities.getAchievementCategoryProgress(category);
    const maxProgress = AchievementUtilities.getAchievementCategoryMaxProgress(category);
    const getCategoryImage = AchievementUtilities.getAchievementCategoryImageUrl(category, progress);
    const getTotalUnseen = AchievementUtilities.getAchievementCategoryTotalUnseen(category);
    const style = {
        '--air-achievement-category-background': `url(${AchievementUtilities.getAchievementImageUrl('achievement_bkg_active1')})`,
        '--air-achievement-category-background-hover': `url(${AchievementUtilities.getAchievementImageUrl('achievement_bkg_active2')})`
    } as CSSProperties;

    return (
        <button
            type="button"
            className={`air-achievements-category-tile${selectedCategoryCode === category.code ? ' is-active' : ''}`}
            style={style}
            onClick={() => setSelectedCategoryCode(category.code)}
        >
            <span className="air-achievements-category-title">{LocalizeText(`quests.${category.code}.name`)}</span>
            <img className="air-achievements-category-art" src={getCategoryImage} alt="" draggable={false} />
            <span className="air-achievements-category-completion">
                {progress}/{maxProgress}
            </span>
            {getTotalUnseen > 0 && <span className="air-achievements-unseen-count">{getTotalUnseen}</span>}
        </button>
    );
};
