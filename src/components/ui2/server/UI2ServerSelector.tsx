import { FC } from 'react';
import { useUI2 } from '../UI2Context';

export const UI2ServerSelector: FC = () =>
{
    const { serverPanelOpen, setServerPanelOpen, colour } = useUI2();

    return (
        <div
            className="solace-ui2-server"
            style={{ '--solace-ui2-colour': colour } as React.CSSProperties}
        >
            <button
                type="button"
                className="solace-ui2-server-tab"
                onClick={() => setServerPanelOpen(!serverPanelOpen)}
            >
                <span>Server</span>
                <span>{serverPanelOpen ? '▲' : '▼'}</span>
            </button>

            {serverPanelOpen && (
                <div className="solace-ui2-server-panel">
                    <button type="button">Hotel</button>
                    <button type="button">Events</button>
                    <button type="button">Games</button>
                </div>
            )}
        </div>
    );
};
