import { GetSessionDataManager, MessengerMessageType } from '@octane/renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import {
    FriendlyTime,
    GetGroupChatData,
    LocalizeText,
    MessengerGroupType,
    MessengerThread,
    MessengerThreadChat,
    MessengerThreadChatGroup,
    useHabbiconCatalog
} from '../../../../../api';
import MessengerNotificationIcon from '../../../../../assets/images/friends/messenger_notification_icon.png';
import { LayoutAvatarImageView, LayoutHabbiconImageView } from '../../../../../common';
import { useFriends } from '../../../../../hooks';
import { resolveAvatarFigure } from '../../friends-list/resolveAvatarFigure';
import {
    PhoneMessengerReaction,
    savePhoneReaction
} from '../../../../../api/phone/PhoneApi';
import { MessengerMessageStatusView } from '../MessengerMessageStatusView';
import { getMessageStatusPresentation } from './messageStatus.helpers';

const MessengerMessageTime: FC<{ date: Date }> = ({ date }) => {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 60000);

        return () => window.clearInterval(timer);
    }, []);

    const elapsedSeconds = Math.max(0, Math.round((now - date.getTime()) / 1000));

    return <div className="messenger-message-time">{FriendlyTime.format(elapsedSeconds, '.ago', 1)}</div>;
};

export const FriendsMessengerThreadGroup: FC<{
    thread: MessengerThread;
    group: MessengerThreadChatGroup;
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
}> = ({
    thread,
    group,
    reactions = [],
    onReactionUpdate = null,
    onReply = null
}) => {
    const { getFriend = null } = useFriends();
    const habbicons = useHabbiconCatalog();
    const [messageActionsOpen, setMessageActionsOpen] = useState(false);
    const [reactionBusy, setReactionBusy] = useState(false);
    const groupChatData = useMemo(() => group.type === MessengerGroupType.GROUP_CHAT && GetGroupChatData(group.chats[0].extraData), [group]);
    const own =
        (group.type === MessengerGroupType.PRIVATE_CHAT && group.userId === GetSessionDataManager().userId) ||
        (!!groupChatData && group.chats.length > 0 && groupChatData.userId === GetSessionDataManager().userId);

    if (!group.userId)
        return (
            <>
                {group.chats.map((chat, index) =>
                    chat.type === MessengerThreadChat.ROOM_INVITE ? (
                        <div key={index} className="messenger-notification">
                            <img src={MessengerNotificationIcon} alt="" />
                            <span>
                                {LocalizeText('messenger.invitation')} {chat.message}
                            </span>
                        </div>
                    ) : chat.type === MessengerThreadChat.STATUS_NOTIFICATION ? (
                        <div key={index} className="messenger-status-notification">
                            {chat.message}
                        </div>
                    ) : null
                )}
            </>
        );

    const friend = getFriend?.(thread.participant.id);
    const name = own ? GetSessionDataManager().userName : groupChatData?.username || thread.participant.name;
    const figure = own
        ? GetSessionDataManager().figure
        : groupChatData?.figure || resolveAvatarFigure(friend?.figure || thread.participant.figure, friend?.gender ?? thread.participant.gender);
    const renderHabbicon = (id: number) => {
        if (!Number.isFinite(id) || id <= 0) return null;

        const entry = habbicons.entries.find((item) => item.id === id);
        const mirror = !!entry?.dir && entry.dir !== (own ? 1 : -1);

        return <LayoutHabbiconImageView id={id} size={80} mirror={mirror} className="messenger-habbicon-message" />;
    };

    const renderMessage = (chat: MessengerThreadChat) => {
        const value = chat.message || '';

        if (chat.type === MessengerMessageType.Habbicon) {
            return renderHabbicon(Number(value));
        }

        const giphyMatch = /^\[giphy:([A-Za-z0-9_-]{1,100})\]$/.exec(value);

        if (giphyMatch) {
            return (
                <img
                    alt="GIF"
                    className="messenger-giphy-message"
                    draggable={false}
                    loading="lazy"
                    src={`https://media.giphy.com/media/${giphyMatch[1]}/giphy.gif`}
                />
            );
        }

        // Compatibility with Habbicons stored by the previous Solace Messenger format.
        const legacyHabbiconMatch = /^\uE000(\d+)$/.exec(value);

        if (legacyHabbiconMatch) {
            return renderHabbicon(Number(legacyHabbiconMatch[1]));
        }

        return value;
    };

    const actionChat = group.chats[group.chats.length - 1];
    const actionMessageId = actionChat?.messageId ?? 0;

    const replyTarget =
        actionChat?.replyToMessageId > 0
            ? thread.getChatByMessageId(actionChat.replyToMessageId)
            : null;

    const replyTargetName = replyTarget
        ? replyTarget.senderId === GetSessionDataManager().userId
            ? GetSessionDataManager().userName
            : groupChatData?.username || thread.participant.name
        : '';


    const messageReactions = useMemo(
        () =>
            actionMessageId > 0
                ? reactions.filter(
                    (entry) =>
                        entry.messageId === actionMessageId &&
                        entry.count > 0
                )
                : [],
        [reactions, actionMessageId]
    );

    const reactToMessage = async (reaction: string) => {
        if (actionMessageId <= 0 || reactionBusy) return;

        setReactionBusy(true);

        try {
            const response = await savePhoneReaction(
                actionMessageId,
                reaction
            );

            onReactionUpdate?.(
                actionMessageId,
                response.reaction || []
            );

            setMessageActionsOpen(false);
        } catch (error) {
            console.error(
                'Could not save Messenger reaction',
                error
            );
        } finally {
            setReactionBusy(false);
        }
    };

    return (
        <div className={`messenger-message-row phone-message-row${own ? ' own' : ' incoming'}`}>
            {own && (
                <div className="message-avatar">
                    <LayoutAvatarImageView direction={2} figure={figure} />
                </div>
            )}
            <div className="messenger-message-body phone-message-body">
                <div className="messenger-message-name phone-message-name">{name}</div>
                <div
                    className="messenger-message-bubble phone-message-bubble"
                    onContextMenu={(event) => {
                        event.preventDefault();

                        if (actionMessageId <= 0) return;

                        setMessageActionsOpen(
                            (current) => !current
                        );
                    }}
                    title={
                        actionMessageId > 0
                            ? 'Right-click for message actions'
                            : undefined
                    }
                >
                    {actionChat?.replyToMessageId > 0 && (
                        <div className="phone-message-reply-quote">
                            <strong>
                                {replyTarget
                                    ? replyTargetName
                                    : 'Earlier message'}
                            </strong>
                            <span>
                                {replyTarget
                                    ? replyTarget.message
                                    : 'Message not currently loaded'}
                            </span>
                        </div>
                    )}

                    {group.chats.map((chat, index) =>
                        !chat.showTranslation ? (
                            <div key={index}>{renderMessage(chat)}</div>
                        ) : (
                            <div key={index} className="messenger-translation-block">
                                <div>
                                    <b>original:</b> {chat.originalMessage || chat.message}
                                </div>
                                <div>
                                    <b>translate:</b> {chat.translatedMessage || chat.message}
                                </div>
                            </div>
                        )
                    )}
                </div>

                {messageActionsOpen && (
                    <div className="phone-message-actions">
                        <button
                            type="button"
                            className="phone-message-reply-action"
                            disabled={actionMessageId <= 0}
                            title="Reply"
                            onClick={() => {
                                if (actionMessageId <= 0) return;

                                onReply?.(
                                    actionMessageId,
                                    name,
                                    actionChat?.message || ''
                                );

                                setMessageActionsOpen(false);
                            }}
                        >
                            Reply
                        </button>

                        <button
                            type="button"
                            disabled={reactionBusy}
                            title="Love"
                            onClick={() => void reactToMessage('❤️')}
                        >
                            ❤️
                        </button>

                        <button
                            type="button"
                            disabled={reactionBusy}
                            title="Laugh"
                            onClick={() => void reactToMessage('😂')}
                        >
                            😂
                        </button>

                        <button
                            type="button"
                            disabled={reactionBusy}
                            title="Like"
                            onClick={() => void reactToMessage('👍')}
                        >
                            👍
                        </button>

                        <button
                            type="button"
                            disabled={reactionBusy}
                            title="Wow"
                            onClick={() => void reactToMessage('😮')}
                        >
                            😮
                        </button>

                        <button
                            type="button"
                            disabled={reactionBusy}
                            title="Sad"
                            onClick={() => void reactToMessage('😢')}
                        >
                            😢
                        </button>

                        <button
                            type="button"
                            disabled={reactionBusy}
                            title="Celebrate"
                            onClick={() => void reactToMessage('🎉')}
                        >
                            🎉
                        </button>
                    </div>
                )}

                {messageReactions.length > 0 && (
                    <div className="phone-message-reactions">
                        {messageReactions.map((entry) => (
                            <button
                                key={`${entry.messageId}-${entry.reaction}`}
                                type="button"
                                className={
                                    `phone-message-reaction-pill` +
                                    `${entry.reactedByMe ? ' active' : ''}`
                                }
                                disabled={reactionBusy}
                                title={
                                    entry.reactedByMe
                                        ? 'You reacted'
                                        : 'React'
                                }
                                onClick={() =>
                                    void reactToMessage(entry.reaction)}
                            >
                                <span>{entry.reaction}</span>
                                <strong>{entry.count}</strong>
                            </button>
                        ))}
                    </div>
                )}

                <MessengerMessageTime date={group.chats[0].date} />
            </div>
            {!own && (
                <div className="message-avatar">
                    <LayoutAvatarImageView direction={4} figure={figure} />
                </div>
            )}
        </div>
    );
};
