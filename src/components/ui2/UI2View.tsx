import { FC } from 'react';
import { useUI2 } from './UI2Context';
import { UI2Toolbar } from './toolbar';
import { UI2Purse } from './purse';
import { UI2VideoPlayerView } from './UI2VideoPlayerView';

export const UI2View: FC = () =>
{
    const {
        enabled,
        colour
    } = useUI2();

    if(!enabled) return null;

    return (
        <div
            className="solace-ui2"
            style={{ '--solace-ui2-colour': colour } as React.CSSProperties}
        >
            <UI2Toolbar />

            <div
                id="toolbar-chat-input-container-ui2"
                className="solace-ui2-chat-target"
            />

            <UI2VideoPlayerView />
            <UI2Purse />
        </div>
    );
};
