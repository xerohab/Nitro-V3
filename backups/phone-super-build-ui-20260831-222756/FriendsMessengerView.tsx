import { AddLinkEventTracker, CreateMessengerGroupComposer, FollowFriendMessageComposer, GetSessionDataManager, ILinkEventTracker, RemoveLinkEventTracker } from '@nitrots/nitro-renderer';
import { FC, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { FaPlus, FaTimes } from 'react-icons/fa';
import { GetUserProfile, LocalizeText, ReportType, SendMessageComposer } from '../../../../api';
import { DraggableWindow, DraggableWindowPosition, LayoutAvatarImageView } from '../../../../common';
import { useFriends, useHelp, useMessenger, useTranslation } from '../../../../hooks';
import { ChatInputEmojiSelectorView } from '../../../room/widgets/chat-input/ChatInputEmojiSelectorView';
import { ChatInputGifSelectorView } from '../../../room/widgets/chat-input/ChatInputGifSelectorView';
import { isStaffChatIdentity } from '../../staffChatIdentity';
import { StaffChatFrankIconView } from '../../StaffChatFrankIconView';
import { resolveAvatarFigure } from '../friends-list/resolveAvatarFigure';
import './FriendsMessengerView.css';
import { FriendsMessengerThreadView } from './messenger-thread/FriendsMessengerThreadView';

const MESSENGER_VISIBLE_AVATARS = 7;

export const FriendsMessengerView: FC<{}> = (props) => {
    const [isVisible, setIsVisible] = useState(false);
    const [lastThreadId, setLastThreadId] = useState(-1);
    const [messageText, setMessageText] = useState('');
    const [avatarStartIndex, setAvatarStartIndex] = useState(0);
    const [groupCreatorVisible, setGroupCreatorVisible] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [groupSearch, setGroupSearch] = useState('');
    const [selectedGroupMembers, setSelectedGroupMembers] = useState<number[]>([]);
    const {
        visibleThreads = [],
        activeThread = null,
        getMessageThread = null,
        sendMessage = null,
        setActiveThreadId = null,
        closeThread = null,
        typingUserIds = [],
        sendTypingStatus = null
    } = useMessenger();
    const { friends = [], getFriend = null } = useFriends();
    const { report = null } = useHelp();
    const { settings, translateOutgoing } = useTranslation();
    const messagesBox = useRef<HTMLDivElement>(null);
    const isTypingRef = useRef<boolean>(false);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

    const stopTyping = () => {
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }

        if (isTypingRef.current && activeThread && activeThread.participant && activeThread.participant.id > 0) {
            sendTypingStatus(activeThread.participant.id, false);
        }

        isTypingRef.current = false;
    };

    const handleInputChange = (value: string) => {
        setMessageText(value);

        const peerId = activeThread && activeThread.participant ? activeThread.participant.id : 0;

        if (peerId <= 0) return;

        if (!value.length) {
            stopTyping();
            return;
        }

        if (!isTypingRef.current) {
            sendTypingStatus(peerId, true);
            isTypingRef.current = true;
        }

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => stopTyping(), 4000);
    };

    const followFriend = () => activeThread && activeThread.participant && SendMessageComposer(new FollowFriendMessageComposer(activeThread.participant.id));
    const openProfile = () => activeThread && activeThread.participant && GetUserProfile(activeThread.participant.id);

    const send = async () => {
        if (!activeThread || !messageText.length) return;

        stopTyping();

        const trimmedText = messageText.trimStart();
        const shouldTranslateOutgoing = settings.enabled && !!trimmedText.length && trimmedText.charAt(0) !== ':';

        if (!shouldTranslateOutgoing) {
            sendMessage(activeThread, GetSessionDataManager().userId, messageText);
            setMessageText('');
            return;
        }

        const translation = await translateOutgoing(messageText);

        if (translation && translation.translatedText?.length && translation.translatedText.length <= 255) {
            sendMessage(activeThread, GetSessionDataManager().userId, translation.translatedText, 0, null, undefined, translation);
            setMessageText('');
            return;
        }

        sendMessage(activeThread, GetSessionDataManager().userId, messageText);

        setMessageText('');
    };

    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Enter') return;

        void send();
    };

    const addMessageEmoji = (emoji: string) => {
        if (!emoji) return;

        setMessageText((current) => `${current}${emoji}`.slice(0, 255));
    };

    const sendGif = (gifId: string) => {
        if (!activeThread || !/^[A-Za-z0-9_-]{1,100}$/.test(gifId)) return;

        stopTyping();
        sendMessage(activeThread, GetSessionDataManager().userId, `[giphy:${gifId}]`);
    };

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length === 2) {
                    if (parts[1] === 'open') {
                        setIsVisible(true);

                        return;
                    }

                    if (parts[1] === 'toggle') {
                        setIsVisible((prevValue) => !prevValue);

                        return;
                    }

                    const participantId = parseInt(parts[1]);
                    const friend = getFriend(participantId);
                    if (!friend) return;

                    // Staff Chat (participantId -1) and direct chats resolve the same
                    // way — one path, so both open in the same messenger window.
                    const thread = getMessageThread(participantId);

                    if (!thread) return;

                    setActiveThreadId(thread.threadId);
                    setIsVisible(true);
                }
            },
            eventUrlPrefix: 'friends-messenger/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [getFriend, getMessageThread, setActiveThreadId]);

    useEffect(() => {
        if (!isVisible || !activeThread) return;
        if (!messagesBox.current) return;

        messagesBox.current.scrollTop = messagesBox.current.scrollHeight;
    }, [isVisible, activeThread]);

    useEffect(() => {
        return () => {
            stopTyping();
        };
    }, [activeThread]);

    useEffect(() => {
        if (isVisible && !activeThread) {
            if (lastThreadId > 0) {
                setActiveThreadId(lastThreadId);
            } else {
                if (visibleThreads.length > 0) setActiveThreadId(visibleThreads[0].threadId);
            }

            return;
        }

        if (!isVisible && activeThread) {
            setLastThreadId(activeThread.threadId);
            setActiveThreadId(-1);
        }
    }, [isVisible, activeThread, lastThreadId, visibleThreads, setActiveThreadId]);

    useEffect(() => {
        const maximumStart = Math.max(0, visibleThreads.length - MESSENGER_VISIBLE_AVATARS);
        const activeIndex = activeThread ? visibleThreads.findIndex((thread) => thread.threadId === activeThread.threadId) : -1;

        setAvatarStartIndex((current) => {
            const clamped = Math.min(current, maximumStart);

            if (activeIndex < 0) return clamped;
            if (activeIndex < clamped) return activeIndex;
            if (activeIndex >= clamped + MESSENGER_VISIBLE_AVATARS) return Math.min(activeIndex - MESSENGER_VISIBLE_AVATARS + 1, maximumStart);

            return clamped;
        });
    }, [activeThread, visibleThreads]);

    const maximumAvatarStart = Math.max(0, visibleThreads.length - MESSENGER_VISIBLE_AVATARS);
    const displayedThreads = visibleThreads.slice(avatarStartIndex, avatarStartIndex + MESSENGER_VISIBLE_AVATARS);
    const scrollAvatars = (direction: -1 | 1) => setAvatarStartIndex((current) => Math.max(0, Math.min(maximumAvatarStart, current + direction)));

    const normalizedGroupSearch = groupSearch.trim().toLowerCase();

    const groupFriendOptions = friends
        .filter((friend) =>
            friend.id > 0 &&
            (!normalizedGroupSearch || friend.name.toLowerCase().includes(normalizedGroupSearch)))
        .sort((a, b) => {
            if (a.online !== b.online) return a.online ? -1 : 1;

            return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        });

    const toggleGroupMember = (friendId: number) => {
        setSelectedGroupMembers((current) =>
            current.includes(friendId)
                ? current.filter((id) => id !== friendId)
                : current.length < 19
                    ? [...current, friendId]
                    : current);
    };

    const closeGroupCreator = () => {
        setGroupCreatorVisible(false);
        setGroupName('');
        setGroupSearch('');
        setSelectedGroupMembers([]);
    };

    const createGroup = () => {
        const normalizedName = groupName.trim();

        if (!normalizedName.length || normalizedName.length > 100) return;
        if (selectedGroupMembers.length < 2 || selectedGroupMembers.length > 19) return;

        SendMessageComposer(
            new CreateMessengerGroupComposer(
                normalizedName,
                selectedGroupMembers
            )
        );

        closeGroupCreator();
    };

    if (!isVisible) return null;

    return (
        <>
        <DraggableWindow handleSelector=".messenger-drag" windowPosition={DraggableWindowPosition.TOP_CENTER} offsetTop={8}>
            <div className="messenger-window phone-messenger-window">
                <div className="messenger-drag" />
                <button className="messenger-minimize" onClick={() => setIsVisible(false)} />
                <div className="messenger-open-title">{LocalizeText('messenger.window.title', ['OPEN_CHAT_COUNT'], [visibleThreads.length.toString()])}</div>
                <div className="messenger-avatar-navigation">
                    <button
                        type="button"
                        className="messenger-avatar-scroll left"
                        data-action="scroll-left"
                        aria-label={LocalizeText('generic.previous')}
                        disabled={avatarStartIndex === 0}
                        onClick={() => scrollAvatars(-1)}
                    />
                    <div className="messenger-avatar-bar">
                        {displayedThreads.map((thread) => {
                            const isStaff = isStaffChatIdentity(thread.participant);
                            const liveFriend = thread.participant.id > 0 ? getFriend(thread.participant.id) : null;
                            const figure = resolveAvatarFigure(
                                liveFriend?.figure || thread.participant.figure,
                                liveFriend?.gender ?? thread.participant.gender
                            );

                            return (
                                <button
                                    key={thread.threadId}
                                    type="button"
                                    data-participant-id={thread.participant.id}
                                    className={'messenger-avatar-tab' + (activeThread === thread ? ' active' : '') + (thread.unread ? ' unread' : '')}
                                    aria-label={thread.participant.name}
                                    aria-selected={activeThread === thread}
                                    onClick={() => setActiveThreadId(thread.threadId)}
                                >
                                    {isStaff ? (
                                        <StaffChatFrankIconView size={35} className="staff-chat-frank" />
                                    ) : (
                                        <LayoutAvatarImageView
                                            figure={figure}
                                            headOnly={true}
                                            compactHead={true}
                                            compactHeadSize={35}
                                            compactHeadPadding={0}
                                            direction={thread.participant.id < 0 ? 3 : 2}
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    <button
                        type="button"
                        className="messenger-avatar-scroll right"
                        data-action="scroll-right"
                        aria-label={LocalizeText('generic.next')}
                        disabled={avatarStartIndex >= maximumAvatarStart}
                        onClick={() => scrollAvatars(1)}
                    />

                    <button
                        type="button"
                        className="messenger-new-group-button"
                        aria-label="New group chat"
                        title="New group chat"
                        onClick={() => setGroupCreatorVisible(true)}
                    >
                        <FaPlus />
                    </button>
                </div>

                {groupCreatorVisible && (
                    <div className="messenger-group-overlay">
                        <div className="messenger-group-panel">
                            <div className="messenger-group-panel-header">
                                <div>
                                    <strong>New Group Chat</strong>
                                    <span>Create a conversation with your friends</span>
                                </div>

                                <button
                                    type="button"
                                    className="messenger-group-panel-close"
                                    aria-label="Close"
                                    onClick={closeGroupCreator}
                                >
                                    <FaTimes />
                                </button>
                            </div>

                            <div className="messenger-group-form">
                                <label htmlFor="messenger-group-name">Group name</label>

                                <input
                                    id="messenger-group-name"
                                    type="text"
                                    maxLength={100}
                                    value={groupName}
                                    placeholder="Enter group name"
                                    onChange={(event) => setGroupName(event.target.value)}
                                />

                                <div className="messenger-group-selection-heading">
                                    <span>Select friends</span>
                                    <strong>{selectedGroupMembers.length}/19</strong>
                                </div>

                                <input
                                    className="messenger-group-search"
                                    type="text"
                                    value={groupSearch}
                                    placeholder="Search friends"
                                    onChange={(event) => setGroupSearch(event.target.value)}
                                />

                                <div className="messenger-group-friends">
                                    {groupFriendOptions.length === 0 && (
                                        <div className="messenger-group-empty">
                                            No friends found.
                                        </div>
                                    )}

                                    {groupFriendOptions.map((friend) => {
                                        const selected = selectedGroupMembers.includes(friend.id);

                                        return (
                                            <button
                                                key={friend.id}
                                                type="button"
                                                className={'messenger-group-friend' + (selected ? ' selected' : '')}
                                                onClick={() => toggleGroupMember(friend.id)}
                                            >
                                                <div className="messenger-group-friend-avatar">
                                                    <LayoutAvatarImageView
                                                        figure={resolveAvatarFigure(friend.figure, friend.gender)}
                                                        headOnly={true}
                                                        compactHead={true}
                                                        compactHeadSize={34}
                                                        compactHeadPadding={0}
                                                        direction={2}
                                                    />
                                                </div>

                                                <div className="messenger-group-friend-details">
                                                    <strong>{friend.name}</strong>
                                                    <span>{friend.online ? 'Online' : 'Offline'}</span>
                                                </div>

                                                <span className="messenger-group-check">
                                                    {selected ? '✓' : ''}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="messenger-group-footer">
                                    <button
                                        type="button"
                                        className="messenger-group-cancel"
                                        onClick={closeGroupCreator}
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="button"
                                        className="messenger-group-create"
                                        disabled={!groupName.trim().length || selectedGroupMembers.length < 2}
                                        onClick={createGroup}
                                    >
                                        Create Group
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeThread && (
                    <>
                        <div className="messenger-thread-header">
                            <div className="phone-conversation-identity">
                                <div className="phone-conversation-avatar">
                                    {isStaffChatIdentity(activeThread.participant) ? (
                                        <StaffChatFrankIconView size={38} className="staff-chat-frank" />
                                    ) : (
                                        <LayoutAvatarImageView
                                            figure={resolveAvatarFigure(
                                                getFriend(activeThread.participant.id)?.figure || activeThread.participant.figure,
                                                getFriend(activeThread.participant.id)?.gender ?? activeThread.participant.gender
                                            )}
                                            headOnly={true}
                                            compactHead={true}
                                            compactHeadSize={38}
                                            compactHeadPadding={0}
                                            direction={2}
                                        />
                                    )}
                                </div>
                                <div className="phone-conversation-text">
                                    <span className="messenger-thread-name">
                                        {activeThread.participant.name}
                                    </span>
                                    <span className="phone-conversation-status">
                                        {activeThread.participant.id > 0 &&
                                        typingUserIds.indexOf(activeThread.participant.id) >= 0
                                            ? LocalizeText('messenger.typing', ['FRIEND_NAME'], [activeThread.participant.name])
                                            : LocalizeText('messenger.window.separator', ['FRIEND_NAME'], [activeThread.participant.name])}
                                    </span>
                                </div>
                            </div>
                            <div className="messenger-actions">
                                {activeThread.participant.id > 0 && (
                                    <>
                                        <button
                                            className="messenger-btn icon-btn follow"
                                            aria-label={LocalizeText('friendlist.tip.follow')}
                                            onClick={followFriend}
                                        />
                                        <button
                                            className="messenger-btn icon-btn profile"
                                            aria-label={LocalizeText('infostand.profile.link.tooltip')}
                                            onClick={openProfile}
                                        />
                                        <button
                                            className="messenger-btn danger"
                                            onClick={() => report(ReportType.IM, { reportedUserId: activeThread.participant.id })}
                                        >
                                            {LocalizeText('messenger.window.button.report')}
                                        </button>
                                    </>
                                )}
                                <button className="messenger-btn close-btn" onClick={(event) => closeThread(activeThread.threadId)}>
                                    <FaTimes />
                                </button>
                            </div>
                        </div>

                        <div ref={messagesBox} className="chat-messages">
                            <FriendsMessengerThreadView thread={activeThread} />
                        </div>

                        {activeThread.participant && activeThread.participant.id > 0 && typingUserIds.indexOf(activeThread.participant.id) >= 0 && (
                            <div className="messenger-typing-indicator">
                                {LocalizeText('messenger.typing', ['FRIEND_NAME'], [activeThread.participant.name])}
                            </div>
                        )}

                        <div className="messenger-input-row phone-composer">
                            <div className="phone-composer-media">
                                <ChatInputEmojiSelectorView addChatEmoji={addMessageEmoji} />
                                <ChatInputGifSelectorView sendGif={sendGif} />
                            </div>

                            <input
                                maxLength={255}
                                placeholder={LocalizeText('messenger.window.input.default', ['FRIEND_NAME'], [activeThread.participant.name])}
                                type="text"
                                value={messageText}
                                onChange={(event) => handleInputChange(event.target.value)}
                                onKeyDown={onKeyDown}
                            />

                            <button
                                aria-label={LocalizeText('widgets.chatinput.say')}
                                className="messenger-btn send"
                                onClick={() => void send()}
                            >
                                {LocalizeText('widgets.chatinput.say')}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </DraggableWindow>
        </>
    );
};
