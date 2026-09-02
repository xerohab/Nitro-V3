import { FC, useEffect } from 'react';
import { MessengerThread } from '../../../../../api';
import { PhoneMessengerReaction } from '../../../../../api/phone/PhoneApi';
import { FriendsMessengerThreadGroup } from './FriendsMessengerThreadGroup';

export const FriendsMessengerThreadView: FC<{
    thread: MessengerThread;
    reactions?: PhoneMessengerReaction[];
    onReactionUpdate?: (
        messageId: number,
        reactions: PhoneMessengerReaction[]
    ) => void;
    onReply?: (
        messageId: number,
        senderName: string,
        message: string
    ) => void;
}> = (props) => {
    const {
        thread = null,
        reactions = [],
        onReactionUpdate = null,
        onReply = null
    } = props;

    // Mark the thread read after commit, not during render — render must stay
    // side-effect free. No dep array: faithfully re-marks on every re-render
    // (e.g. a new message arriving in the active thread), same as before.
    useEffect(() => {
        if (thread) thread.setRead();
    });

    if (!thread) return null;

    return (
        <>
            {thread.groups.length > 0 &&
                thread.groups.map((group, index) => (
                    <FriendsMessengerThreadGroup
                        key={index}
                        group={group}
                        thread={thread}
                        reactions={reactions}
                        onReactionUpdate={onReactionUpdate}
                        onReply={onReply}
                    />
                ))}
        </>
    );
};
