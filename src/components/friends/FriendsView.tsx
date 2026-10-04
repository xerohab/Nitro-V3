import { FC, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFriends } from '../../hooks';
import { FriendBarView } from './views/friends-bar/FriendsBarView';
import { FriendsListView } from './views/friends-list/FriendsListView';
import { FriendsMessengerView } from './views/messenger/FriendsMessengerView';
import { useUI2 } from '../ui2/UI2Context';

const FRIEND_BAR_TARGET_IDS = {
    ui1: 'toolbar-friend-bar-container-desktop-ui1',
    ui2: 'toolbar-friend-bar-container-desktop-ui2'
};

export const FriendsView: FC<{}> = (props) => {
    const { enabled: ui2Enabled } = useUI2();
    const { settings = null, onlineFriends = [], requests = [] } = useFriends();
    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

    useEffect(() => {
        if (typeof document === 'undefined') return;

        const resolveTarget = () => {
            const targetId = ui2Enabled
                ? FRIEND_BAR_TARGET_IDS.ui2
                : FRIEND_BAR_TARGET_IDS.ui1;

            const element = document.getElementById(targetId);

            setPortalTarget((previous) =>
                previous === element ? previous : element
            );
        };

        resolveTarget();

        const observer = new MutationObserver(resolveTarget);

        observer.observe(document.body, { childList: true, subtree: true });

        return () => observer.disconnect();
    }, [ui2Enabled]);

    if (!settings) return null;

    return (
        <>
            {portalTarget && createPortal(<FriendBarView onlineFriends={onlineFriends} requestsCount={requests.length} />, portalTarget)}
            <FriendsListView />
            <FriendsMessengerView />
        </>
    );
};
