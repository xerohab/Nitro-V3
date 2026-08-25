import { CSSProperties, FC } from 'react';
import { AchievementUtilities } from '../../api';

interface AirAchievementProgressBarProps {
    progress: number;
    maxProgress: number;
    text: string;
    width: number;
    className?: string;
}

export const AirAchievementProgressBar: FC<AirAchievementProgressBarProps> = ({ progress = 0, maxProgress = 0, text = '', width, className = '' }) => {
    const safeProgress = Math.max(0, progress);
    const progressWidth = maxProgress > 0 ? Math.max(0, Math.round((width * safeProgress) / maxProgress)) : 0;
    const style = {
        '--air-achievement-progress-left': `url(${AchievementUtilities.getAchievementImageUrl('ach_progressbar1')})`,
        '--air-achievement-progress-track': `url(${AchievementUtilities.getAchievementImageUrl('ach_progressbar2')})`,
        '--air-achievement-progress-right': `url(${AchievementUtilities.getAchievementImageUrl('ach_progressbar3')})`,
        '--air-achievement-progress-fill': `url(${AchievementUtilities.getAchievementImageUrl('ach_progressbar4')})`,
        '--air-achievement-progress-fill-cap': `url(${AchievementUtilities.getAchievementImageUrl('ach_progressbar5')})`,
        width: width + 10
    } as CSSProperties;

    return (
        <div className={`air-achievement-progress ${className}`.trim()} style={style}>
            <span className="air-achievement-progress__left" aria-hidden="true" />
            <span className="air-achievement-progress__track" style={{ width }} aria-hidden="true" />
            <span className="air-achievement-progress__right" style={{ left: width + 4 }} aria-hidden="true" />
            <span className="air-achievement-progress__fill-background" style={{ width: progressWidth + 1 }} aria-hidden="true" />
            <span className="air-achievement-progress__fill" style={{ width: progressWidth }} aria-hidden="true" />
            <span className="air-achievement-progress__fill-cap" style={{ left: progressWidth + 4 }} aria-hidden="true" />
            <span className="air-achievement-progress__text" style={{ width }}>
                {text}
            </span>
        </div>
    );
};
