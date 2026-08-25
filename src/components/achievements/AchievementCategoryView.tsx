import { FC, useLayoutEffect } from 'react';
import { AchievementCategory } from '../../api';
import { useAchievements } from '../../hooks';
import { AchievementDetailsView } from './AchievementDetailsView';
import { AchievementListView } from './achievement-list';

interface AchievementCategoryViewProps {
    category: AchievementCategory;
}

export const AchievementCategoryView: FC<AchievementCategoryViewProps> = (props) => {
    const { category = null } = props;
    const { selectedAchievement = null, setSelectedAchievementId = null } = useAchievements();

    useLayoutEffect(() => {
        if (!category) return;

        if (!selectedAchievement) {
            setSelectedAchievementId(category?.achievements?.[0]?.achievementId);
        }
    }, [category, selectedAchievement, setSelectedAchievementId]);

    if (!category) return null;

    return (
        <div className="air-achievements-category-body">
            <AchievementListView achievements={category.achievements} />
            {!!selectedAchievement && <AchievementDetailsView achievement={selectedAchievement} />}
        </div>
    );
};
