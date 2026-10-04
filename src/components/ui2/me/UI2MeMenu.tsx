import { PerkAllowancesMessageEvent, PerkEnum } from '@octane/renderer';
import { FC, useEffect, useRef, useState } from 'react';
import { useAchievements, useMessageEvent } from '../../../hooks';
import { ToolbarMeView } from '../../toolbar/ToolbarMeView';

interface Props
{
    onClose?: () => void;
}

export const UI2MeMenu: FC<Props> = ({ onClose }) =>
{
    const [meExpanded, setMeExpanded] = useState(true);
    const [useGuideTool, setUseGuideTool] = useState(false);

    const { getTotalUnseen } = useAchievements();
    const menuRef = useRef<HTMLDivElement>(null);

    useMessageEvent<PerkAllowancesMessageEvent>(
        PerkAllowancesMessageEvent,
        event =>
        {
            setUseGuideTool(
                event.getParser().isAllowed(PerkEnum.USE_GUIDE_TOOL)
            );
        }
    );

    useEffect(() =>
    {
        const handleDocumentClick = (event: MouseEvent) =>
        {
            const target = event.target as Node;

            if(menuRef.current?.contains(target)) return;

            onClose?.();
        };

        const handleKeyDown = (event: KeyboardEvent) =>
        {
            if(event.key === 'Escape')
            {
                onClose?.();
            }
        };

        document.addEventListener('click', handleDocumentClick);
        document.addEventListener('keydown', handleKeyDown);

        return () =>
        {
            document.removeEventListener('click', handleDocumentClick);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [ onClose ]);

    return (
        <div
            ref={menuRef}
            className="solace-ui2-me-menu"
            onClick={event => event.stopPropagation()}
        >
            <ToolbarMeView
                setMeExpanded={setMeExpanded}
                unseenAchievementCount={getTotalUnseen}
                useGuideTool={useGuideTool}
            />
        </div>
    );
};
