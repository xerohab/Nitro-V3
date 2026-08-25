import { IRoomCameraWidgetEffect } from '@nitrots/nitro-renderer';
import { FC } from 'react';
import { FaTimes } from 'react-icons/fa';
import { LocalizeText } from '../../../../../api';

export interface CameraWidgetEffectListItemViewProps {
    effect: IRoomCameraWidgetEffect;
    thumbnailUrl: string;
    isActive: boolean;
    isLocked: boolean;
    isSelected: boolean;
    selectEffect: () => void;
    removeEffect: () => void;
}

export const CameraWidgetEffectListItemView: FC<CameraWidgetEffectListItemViewProps> = (props) => {
    const { effect = null, thumbnailUrl = null, isActive = false, isLocked = false, isSelected = false, selectEffect = null, removeEffect = null } = props;
    const title = isLocked ? `${LocalizeText('camera.effect.required.level')} ${effect.minLevel}` : LocalizeText(`camera.effect.name.${effect.name}`);

    return (
        <div
            className={[
                'nitro-camera-effect',
                isActive && effect.type !== 'frame' && 'nitro-camera-effect--active',
                isSelected && 'nitro-camera-effect--selected',
                isLocked && 'nitro-camera-effect--locked'
            ]
                .filter(Boolean)
                .join(' ')}
            title={title}
        >
            <button type="button" className="nitro-camera-effect__select" disabled={isLocked} aria-label={title} aria-pressed={isActive} onClick={selectEffect}>
                {!isLocked && thumbnailUrl && <img alt="" src={thumbnailUrl} />}
                {isLocked && (
                    <span className="nitro-camera-effect__lock" aria-hidden="true">
                        ?
                    </span>
                )}
            </button>
            {isActive && (
                <button type="button" className="nitro-camera-effect__remove" aria-label={LocalizeText('camera.delete.button.text')} onClick={removeEffect}>
                    <FaTimes aria-hidden="true" />
                </button>
            )}
        </div>
    );
};
