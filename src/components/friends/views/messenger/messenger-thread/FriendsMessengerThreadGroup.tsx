import { GetSessionDataManager } from '@nitrots/nitro-renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import {
    FriendlyTime,
    GetConfigurationValue,
    GetGroupChatData,
    LocalizeText,
    MessengerGroupType,
    MessengerThread,
    MessengerThreadChat,
    MessengerThreadChatGroup
} from '../../../../../api';
import MessengerNotificationIcon from '../../../../../assets/images/friends/messenger_notification_icon.png';
import { LayoutAvatarImageView } from '../../../../../common';
import { useFriends } from '../../../../../hooks';
import { resolveAvatarFigure } from '../../friends-list/resolveAvatarFigure';
import {
    PhoneMessengerReaction,
    savePhoneReaction
} from '../../../../../api/phone/PhoneApi';
import { MessengerMessageStatusView } from '../MessengerMessageStatusView';
import { getMessageStatusPresentation } from './messageStatus.helpers';

type HabbiconFrame = { x: number; y: number; width: number; height: number; dir: number };
type HabbiconSheet = { frames: Map<number, HabbiconFrame>; width: number; height: number };
const habbiconFrameCache = new Map<string, HabbiconSheet>();
const HABBICON_MESSAGE_SIZE = 80;
const HABBICON_MESSAGE_SCALE = 2;

const MessengerMessageTime: FC<{ date: Date }> = ({ date }) => {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 60000);

        return () => window.clearInterval(timer);
    }, []);

    const elapsedSeconds = Math.max(0, Math.round((now - date.getTime()) / 1000));

    return <div className="messenger-message-time">{FriendlyTime.format(elapsedSeconds, '.ago', 1)}</div>;
};

const MessengerHabbiconMessage: FC<{ id: number; assetRoot: string; own: boolean }> = ({ id, assetRoot, own }) => {
    const [sheet, setSheet] = useState<HabbiconSheet>(null);

    useEffect(() => {
        if (!assetRoot) return;

        const cached = habbiconFrameCache.get(assetRoot);

        if (cached) {
            setSheet(cached);
            return;
        }

        let disposed = false;

        void fetch(`${assetRoot}habbicons.json`)
            .then((response) => (response.ok ? response.json() : null))
            .then((data) => {
                if (disposed || !Array.isArray(data?.habbicons)) return;

                const frames = new Map<number, HabbiconFrame>();
                let width = 1;
                let height = 1;

                for (const entry of data.habbicons) {
                    const frame: HabbiconFrame = {
                        x: Number(entry.x) || 0,
                        y: Number(entry.y) || 0,
                        width: Number(entry.width) || 42,
                        height: Number(entry.height) || 42,
                        dir: Number(entry.dir) || 0
                    };

                    frames.set(Number(entry.id), frame);
                    width = Math.max(width, frame.x + frame.width);
                    height = Math.max(height, frame.y + frame.height);
                }

                const nextSheet = { frames, width, height };

                habbiconFrameCache.set(assetRoot, nextSheet);
                setSheet(nextSheet);
            });

        return () => {
            disposed = true;
        };
    }, [assetRoot, id]);

    const frame = sheet?.frames.get(id);

    if (!frame || !sheet) return null;

    const facing: number = own ? 1 : -1;
    const mirror = facing !== 0 && frame.dir !== 0 && facing !== frame.dir;

    return (
        <span
            className={`messenger-habbicon-message${mirror ? ' mirrored' : ''}`}
            style={{
                width: HABBICON_MESSAGE_SIZE,
                height: HABBICON_MESSAGE_SIZE,
                backgroundImage: `url(${assetRoot}habbicons_spritesheet.png)`,
                backgroundSize: `${sheet.width * HABBICON_MESSAGE_SCALE}px ${sheet.height * HABBICON_MESSAGE_SCALE}px`,
                backgroundPosition: `-${frame.x * HABBICON_MESSAGE_SCALE}px -${frame.y * HABBICON_MESSAGE_SCALE}px`
            }}
        />
    );
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
    const assetRoot = (() => {
        const root = GetConfigurationValue<string>('habbicons.asset.root', '');
        const hash = GetConfigurationValue<string>('habbicons.asset.hash', '');

        if (!root) return '';

        const normalizedRoot = root.endsWith('/') ? root : `${root}/`;

        return hash ? `${normalizedRoot}${hash}/` : normalizedRoot;
    })();
    const renderMessage = (message: string) => {
        const value = message || '';

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

        // Preserve rendering of Habbicons already present in message history.
        const habbiconMatch = /^\uE000(\d+)$/.exec(value);

        if (habbiconMatch && assetRoot) {
            return <MessengerHabbiconMessage id={Number(habbiconMatch[1])} assetRoot={assetRoot} own={own} />;
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
                            <div key={index}>{renderMessage(chat.message)}</div>
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
