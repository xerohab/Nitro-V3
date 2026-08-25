import { Dispatch, FC, SetStateAction } from 'react';
import { IAchievementCategory } from '../../../api';
import { AchievementsCategoryListItemView } from './AchievementsCategoryListItemView';

interface AchievementsCategoryListViewProps {
    categories: IAchievementCategory[];
    selectedCategoryCode: string;
    setSelectedCategoryCode: Dispatch<SetStateAction<string>>;
}

export const AchievementsCategoryListView: FC<AchievementsCategoryListViewProps> = (props) => {
    const { categories = null, selectedCategoryCode = null, setSelectedCategoryCode = null } = props;
    const itemCount = Math.max(9, categories?.length ?? 0);

    return (
        <div className="air-achievements-categories">
            {Array.from({ length: itemCount }, (_, index) => {
                const category = categories?.[index] ?? null;

                return (
                    <AchievementsCategoryListItemView
                        key={category?.code ?? `empty-${index}`}
                        category={category}
                        selectedCategoryCode={selectedCategoryCode}
                        setSelectedCategoryCode={setSelectedCategoryCode}
                    />
                );
            })}
        </div>
    );
};
