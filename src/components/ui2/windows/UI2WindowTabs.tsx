import { FC } from 'react';
import { useUI2 } from '../UI2Context';

export const UI2WindowTabs: FC = () =>
{
    const { actionPanelOpen, setActionPanelOpen, colour } = useUI2();

    return (
        <div
            className="solace-ui2-window-tabs"
            style={{ '--solace-ui2-colour': colour } as React.CSSProperties}
        >
            <button
                type="button"
                onClick={() => setActionPanelOpen(!actionPanelOpen)}
            >
                <span>Quick Actions</span>
                <span>{actionPanelOpen ? '▲' : '▼'}</span>
            </button>

            {actionPanelOpen && (
                <div className="solace-ui2-window-panel">
                    <button type="button">Profile</button>
                    <button type="button">Achievements</button>
                    <button type="button">Friends</button>
                    <button type="button">Messages</button>
                </div>
            )}
        </div>
    );
};
