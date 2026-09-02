import { AddLinkEventTracker, CreateMessengerGroupComposer, FollowFriendMessageComposer, GetSessionDataManager, ILinkEventTracker, RemoveLinkEventTracker } from '@nitrots/nitro-renderer';
import { FC, KeyboardEvent, useEffect, useRef, useState } from 'react';
import {
    FaAddressBook,
    FaBell,
    FaComments,
    FaCog,
    FaEllipsisV,
    FaHome,
    FaLock,
    FaPlus,
    FaShoppingBag,
    FaStar,
    FaTimes,
    FaUser,
    FaWallet
} from 'react-icons/fa';
import { GetUserProfile, LocalizeText, ReportType, SendMessageComposer } from '../../../../api';
import {
    getPhoneState,
    markPhoneNotificationRead,
    PhoneCatalogItem,
    PhoneState,
    purchasePhoneItem,
    savePhoneContact,
    savePhoneSettings,
    managePhoneGroup
} from '../../../../api/phone/PhoneApi';
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

type PhoneApp =
    | 'messenger'
    | 'home'
    | 'notifications'
    | 'store'
    | 'settings'
    | 'wallet'
    | 'profile'
    | 'contacts';


export const FriendsMessengerView: FC<{}> = (props) => {
    const [isVisible, setIsVisible] = useState(false);
    const [lastThreadId, setLastThreadId] = useState(-1);
    const [messageText, setMessageText] = useState('');
    const [avatarStartIndex, setAvatarStartIndex] = useState(0);
    const [groupCreatorVisible, setGroupCreatorVisible] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [groupSearch, setGroupSearch] = useState('');
    const [selectedGroupMembers, setSelectedGroupMembers] = useState<number[]>([]);
    const [phoneApp, setPhoneApp] = useState<PhoneApp>('messenger');
    const [phoneLocked, setPhoneLocked] = useState(false);
    const [phoneState, setPhoneState] = useState<PhoneState>(null);
    const [phoneLoading, setPhoneLoading] = useState(false);
    const [phoneError, setPhoneError] = useState('');
    const [phoneBusyItemId, setPhoneBusyItemId] = useState<number>(0);
    const [groupManagerVisible, setGroupManagerVisible] = useState(false);
    const [groupManagerBusy, setGroupManagerBusy] = useState(false);
    const [groupMemberSearch, setGroupMemberSearch] = useState('');
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


    const isActiveGroupConversation =
        !!activeThread &&
        activeThread.participant &&
        activeThread.participant.id < 0 &&
        !isStaffChatIdentity(activeThread.participant);

    const activeGroupConversationId =
        isActiveGroupConversation
            ? Math.abs(activeThread.participant.id)
            : 0;

    const runGroupAction = async (
        action: string,
        extra: Record<string, unknown> = {}
    ) => {
        if (!activeGroupConversationId || groupManagerBusy) return false;

        setGroupManagerBusy(true);
        setPhoneError('');

        try {
            await managePhoneGroup(
                activeGroupConversationId,
                action,
                extra
            );

            await loadPhone(true);

            return true;
        } catch (error) {
            setPhoneError(
                error instanceof Error
                    ? error.message
                    : 'Could not update group.'
            );

            return false;
        } finally {
            setGroupManagerBusy(false);
        }
    };

    const renameActiveGroup = async () => {
        if (!isActiveGroupConversation) return;

        const name = window.prompt(
            'New group name',
            activeThread.participant.name || ''
        );

        if (name === null) return;

        const normalized = name.trim();

        if (!normalized.length || normalized.length > 100) return;

        await runGroupAction('rename', { name: normalized });
    };

    const muteActiveGroup = async () => {
        if (!isActiveGroupConversation) return;

        await runGroupAction('mute', { muted: true });
    };

    const unmuteActiveGroup = async () => {
        if (!isActiveGroupConversation) return;

        await runGroupAction('mute', { muted: false });
    };

    const leaveActiveGroup = async () => {
        if (!isActiveGroupConversation) return;

        if (!window.confirm(
            `Leave ${activeThread.participant.name}?`
        )) return;

        const success = await runGroupAction('leave');

        if (!success) return;

        setGroupManagerVisible(false);
        closeThread(activeThread.threadId);
    };

    const addFriendToActiveGroup = async (friendId: number) => {
        if (!isActiveGroupConversation || friendId <= 0) return;

        const success = await runGroupAction(
            'add_member',
            { userId: friendId }
        );

        if (success) setGroupMemberSearch('');
    };


    const phoneUnreadMessenger = visibleThreads.filter((thread) => thread.unread).length;
    const phoneUnreadNotifications = phoneState?.notifications?.filter((item) => !item.read).length || 0;

    const loadPhone = async (silent = false) => {
        if (!silent) setPhoneLoading(true);

        setPhoneError('');

        try {
            const nextState = await getPhoneState();

            setPhoneState(nextState);
        } catch (error) {
            setPhoneError(error instanceof Error ? error.message : 'Could not load phone data.');
        } finally {
            if (!silent) setPhoneLoading(false);
        }
    };

    const openPhoneApp = (app: PhoneApp) => {
        setPhoneLocked(false);
        setPhoneApp(app);

        if (app !== 'messenger') void loadPhone(true);
    };

    const updatePhoneSettings = async (changes: Record<string, unknown>) => {
        setPhoneError('');

        try {
            const response = await savePhoneSettings(changes);

            setPhoneState((current) =>
                current
                    ? {
                        ...current,
                        settings: response.settings
                    }
                    : current);
        } catch (error) {
            setPhoneError(error instanceof Error ? error.message : 'Could not save phone settings.');
        }
    };

    const buyPhoneItem = async (item: PhoneCatalogItem) => {
        if (!item || phoneBusyItemId) return;

        setPhoneBusyItemId(item.id);
        setPhoneError('');

        try {
            await purchasePhoneItem(item.id);
            await loadPhone(true);
        } catch (error) {
            setPhoneError(error instanceof Error ? error.message : 'Could not complete purchase.');
        } finally {
            setPhoneBusyItemId(0);
        }
    };

    const equipPhoneItem = async (item: PhoneCatalogItem) => {
        if (!item) return;

        const key =
            item.type === 'wallpaper'
                ? 'wallpaper_key'
                : item.type === 'theme'
                    ? 'theme_key'
                    : item.type === 'case'
                        ? 'case_key'
                        : item.type === 'sound'
                            ? 'message_sound_key'
                            : '';

        if (!key) return;

        await updatePhoneSettings({ [key]: item.key });
    };

    const toggleFavourite = async (friendId: number) => {
        const current = phoneState?.contacts?.find((contact) => contact.userId === friendId);
        const nextFavourite = !current?.favourite;

        setPhoneError('');

        try {
            await savePhoneContact(
                friendId,
                nextFavourite,
                current?.nickname || null,
                current?.messageSoundKey || null
            );

            await loadPhone(true);
        } catch (error) {
            setPhoneError(error instanceof Error ? error.message : 'Could not update favourite.');
        }
    };

    const editContactNickname = async (friendId: number, friendName: string) => {
        const current = phoneState?.contacts?.find((contact) => contact.userId === friendId);

        const nickname = window.prompt(
            `Private nickname for ${ friendName }`,
            current?.nickname || ''
        );

        if (nickname === null) return;

        setPhoneError('');

        try {
            await savePhoneContact(
                friendId,
                !!current?.favourite,
                nickname.trim() || null,
                current?.messageSoundKey || null
            );

            await loadPhone(true);
        } catch (error) {
            setPhoneError(error instanceof Error ? error.message : 'Could not save nickname.');
        }
    };

    const readPhoneNotification = async (
        notificationId: number,
        app?: string
    ) => {
        try {
            await markPhoneNotificationRead(notificationId);
            await loadPhone(true);

            const target =
                app === 'messenger'
                    ? 'messenger'
                    : app === 'contacts'
                        ? 'contacts'
                        : app === 'profile'
                            ? 'profile'
                            : app === 'wallet'
                                ? 'wallet'
                                : app === 'store'
                                    ? 'store'
                                    : app === 'settings'
                                        ? 'settings'
                                        : null;

            if (target) openPhoneApp(target as PhoneApp);
        } catch (error) {
            setPhoneError(
                error instanceof Error
                    ? error.message
                    : 'Could not update notification.'
            );
        }
    };

    useEffect(() => {
        if (!isVisible) return;

        void loadPhone(true);
    }, [isVisible]);

    const renderPhoneHome = () => (
        <div className="phone-app-page phone-home-page">
            <div className="phone-home-profile">
                <div className="phone-home-avatar">
                    <LayoutAvatarImageView
                        figure={phoneState?.profile?.figure || GetSessionDataManager().figure}
                        headOnly={true}
                        compactHead={true}
                        compactHeadSize={58}
                        compactHeadPadding={0}
                        direction={2}
                    />
                </div>

                <div>
                    <strong>{phoneState?.profile?.username || GetSessionDataManager().userName}</strong>
                    <span>{phoneState?.profile?.motto || 'Welcome back'}</span>
                </div>
            </div>

            <div className="phone-home-grid">
                <button onClick={() => openPhoneApp('messenger')}>
                    <span className="phone-app-icon messenger"><FaComments /></span>
                    <strong>Messenger</strong>
                    {phoneUnreadMessenger > 0 && <em>{phoneUnreadMessenger}</em>}
                </button>

                <button onClick={() => openPhoneApp('notifications')}>
                    <span className="phone-app-icon notifications"><FaBell /></span>
                    <strong>Notifications</strong>
                    {phoneUnreadNotifications > 0 && <em>{phoneUnreadNotifications}</em>}
                </button>

                <button onClick={() => openPhoneApp('contacts')}>
                    <span className="phone-app-icon contacts"><FaAddressBook /></span>
                    <strong>Contacts</strong>
                </button>

                <button onClick={() => openPhoneApp('profile')}>
                    <span className="phone-app-icon profile"><FaUser /></span>
                    <strong>Profile</strong>
                </button>

                <button onClick={() => openPhoneApp('wallet')}>
                    <span className="phone-app-icon wallet"><FaWallet /></span>
                    <strong>Wallet</strong>
                </button>

                <button onClick={() => openPhoneApp('store')}>
                    <span className="phone-app-icon store"><FaShoppingBag /></span>
                    <strong>Phone Store</strong>
                </button>

                <button onClick={() => openPhoneApp('settings')}>
                    <span className="phone-app-icon settings"><FaCog /></span>
                    <strong>Settings</strong>
                </button>
            </div>

            <div className="phone-home-status">
                <span>
                    Presence
                    <strong>{phoneState?.settings?.presence_mode || 'online'}</strong>
                </span>
                <span>
                    Credits
                    <strong>{phoneState?.wallet?.credits ?? '—'}</strong>
                </span>
                <span>
                    Diamonds
                    <strong>{phoneState?.wallet?.diamonds ?? '—'}</strong>
                </span>
            </div>
        </div>
    );

    const renderNotifications = () => (
        <div className="phone-app-page">
            <div className="phone-section-heading">
                <div>
                    <strong>Notifications</strong>
                    <span>{phoneUnreadNotifications} unread</span>
                </div>

                {phoneUnreadNotifications > 0 && (
                    <button
                        onClick={async () => {
                            await markPhoneNotificationRead(undefined, true);
                            await loadPhone(true);
                        }}
                    >
                        Mark all read
                    </button>
                )}
            </div>

            <div className="phone-list">
                {!phoneState?.notifications?.length && (
                    <div className="phone-empty-state">
                        <FaBell />
                        <strong>No notifications yet</strong>
                        <span>Hotel alerts, achievements, gifts and other phone alerts will appear here.</span>
                    </div>
                )}

                {phoneState?.notifications?.map((notification) => (
                    <button
                        key={notification.id}
                        className={`phone-notification-card${notification.read ? '' : ' unread'}`}
                        onClick={() =>
                            void readPhoneNotification(
                                notification.id,
                                notification.app
                            )}
                    >
                        <span className="phone-notification-dot" />
                        <div>
                            <strong>{notification.title}</strong>
                            <p>{notification.body}</p>
                            <small>
                                {new Date(notification.createdAt * 1000).toLocaleString()}
                            </small>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );

    const renderStore = () => {
        const owned = new Set(phoneState?.owned || []);

        return (
            <div className="phone-app-page">
                <div className="phone-section-heading">
                    <div>
                        <strong>Phone Store</strong>
                        <span>Items stay permanently owned</span>
                    </div>
                </div>

                <div className="phone-store-grid">
                    {phoneState?.catalog?.map((item) => {
                        const itemOwned = item.price === 0 || owned.has(item.id);

                        const equipped =
                            phoneState?.settings?.wallpaper_key === item.key ||
                            phoneState?.settings?.theme_key === item.key ||
                            phoneState?.settings?.case_key === item.key ||
                            phoneState?.settings?.message_sound_key === item.key ||
                            phoneState?.settings?.notification_sound_key === item.key;

                        return (
                            <div
                                key={item.id}
                                className={`phone-store-card phone-store-${item.type}${equipped ? ' equipped' : ''}`}
                            >
                                <div
                                    className={`phone-store-preview phone-preview-${item.asset}`}
                                >
                                    <span>{item.type}</span>
                                </div>

                                <strong>{item.name}</strong>
                                <p>{item.description}</p>

                                <div className="phone-store-card-footer">
                                    {!itemOwned ? (
                                        <>
                                            <span className="phone-price">
                                                {item.price} {item.currencyType < 0 ? 'Credits' : 'Diamonds'}
                                            </span>

                                            <button
                                                disabled={phoneBusyItemId !== 0}
                                                onClick={() => void buyPhoneItem(item)}
                                            >
                                                {phoneBusyItemId === item.id ? 'Buying…' : 'Buy'}
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <span className="phone-owned-label">
                                                {equipped ? 'Equipped' : 'Owned'}
                                            </span>

                                            {!equipped && (
                                                <button onClick={() => void equipPhoneItem(item)}>
                                                    Equip
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderSettings = () => (
        <div className="phone-app-page">
            <div className="phone-section-heading">
                <div>
                    <strong>Settings</strong>
                    <span>Appearance, presence and alerts</span>
                </div>
            </div>

            <div className="phone-settings-list">
                <label>
                    <div>
                        <strong>Presence</strong>
                        <span>Choose how you appear on the phone</span>
                    </div>

                    <select
                        value={phoneState?.settings?.presence_mode || 'online'}
                        onChange={(event) =>
                            void updatePhoneSettings({ presence_mode: event.target.value })}
                    >
                        <option value="online">Online</option>
                        <option value="busy">Busy</option>
                        <option value="dnd">Do Not Disturb</option>
                        <option value="invisible">Invisible</option>
                    </select>
                </label>

                {[
                    ['dnd_enabled', 'Do Not Disturb', 'Silence phone sounds and popups'],
                    ['lockscreen_notifications', 'Lock-screen notifications', 'Show phone alerts while locked'],
                    ['messenger_notifications', 'Messenger alerts', 'Allow Messenger phone notifications'],
                    ['friend_request_notifications', 'Friend requests', 'Allow friend-request alerts'],
                    ['hotel_notifications', 'Hotel notifications', 'Allow staff and hotel alerts']
                ].map(([key, title, description]) => (
                    <label key={key}>
                        <div>
                            <strong>{title}</strong>
                            <span>{description}</span>
                        </div>

                        <input
                            type="checkbox"
                            checked={!!phoneState?.settings?.[key]}
                            onChange={(event) =>
                                void updatePhoneSettings({ [key]: event.target.checked })}
                        />
                    </label>
                ))}
            </div>

            <div className="phone-equipped-summary">
                <strong>Currently equipped</strong>

                <span>
                    Wallpaper
                    <b>{phoneState?.settings?.wallpaper_key || 'wallpaper_default'}</b>
                </span>

                <span>
                    Theme
                    <b>{phoneState?.settings?.theme_key || 'theme_dark'}</b>
                </span>

                <span>
                    Case
                    <b>{phoneState?.settings?.case_key || 'case_black'}</b>
                </span>

                <button onClick={() => openPhoneApp('store')}>
                    Browse Phone Store
                </button>
            </div>
        </div>
    );

    const renderWallet = () => (
        <div className="phone-app-page">
            <div className="phone-wallet-balances">
                <div>
                    <span>Credits</span>
                    <strong>{phoneState?.wallet?.credits ?? '—'}</strong>
                </div>

                <div>
                    <span>Diamonds</span>
                    <strong>{phoneState?.wallet?.diamonds ?? '—'}</strong>
                </div>
            </div>

            <div className="phone-section-heading">
                <div>
                    <strong>Recent Phone Purchases</strong>
                    <span>Your permanently owned phone cosmetics</span>
                </div>
            </div>

            <div className="phone-list">
                {!phoneState?.purchases?.length && (
                    <div className="phone-empty-state">
                        <FaWallet />
                        <strong>No phone purchases yet</strong>
                    </div>
                )}

                {phoneState?.purchases?.map((purchase) => (
                    <div key={purchase.id} className="phone-purchase-row">
                        <div>
                            <strong>{purchase.name}</strong>
                            <span>{purchase.type}</span>
                        </div>

                        <div>
                            <strong>
                                {purchase.amount === 0
                                    ? 'Free'
                                    : `${purchase.amount} ${purchase.currencyType < 0 ? 'Credits' : 'Diamonds'}`}
                            </strong>
                            <span>{new Date(purchase.purchasedAt * 1000).toLocaleDateString()}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderProfile = () => (
        <div className="phone-app-page">
            <div className="phone-profile-card">
                <div className="phone-profile-avatar">
                    <LayoutAvatarImageView
                        figure={phoneState?.profile?.figure || GetSessionDataManager().figure}
                        direction={2}
                    />
                </div>

                <strong>{phoneState?.profile?.username || GetSessionDataManager().userName}</strong>
                <p>{phoneState?.profile?.motto || ''}</p>

                <div className="phone-profile-stats">
                    <span>
                        Credits
                        <b>{phoneState?.wallet?.credits ?? '—'}</b>
                    </span>

                    <span>
                        Diamonds
                        <b>{phoneState?.wallet?.diamonds ?? '—'}</b>
                    </span>

                    <span>
                        Owned
                        <b>{phoneState?.owned?.length || 0}</b>
                    </span>
                </div>
            </div>
        </div>
    );

    const renderContacts = () => {
        const contactMap = new Map(
            (phoneState?.contacts || []).map((contact) => [contact.userId, contact])
        );

        const orderedFriends = [...friends].sort((left, right) => {
            const leftFavourite = !!contactMap.get(left.id)?.favourite;
            const rightFavourite = !!contactMap.get(right.id)?.favourite;

            if (leftFavourite !== rightFavourite) return leftFavourite ? -1 : 1;
            if (left.online !== right.online) return left.online ? -1 : 1;

            return left.name.localeCompare(right.name);
        });

        return (
            <div className="phone-app-page">
                <div className="phone-section-heading">
                    <div>
                        <strong>Contacts</strong>
                        <span>Favourites appear first</span>
                    </div>
                </div>

                <div className="phone-contact-list">
                    {orderedFriends.map((friend) => {
                        const contact = contactMap.get(friend.id);

                        return (
                            <div key={friend.id} className="phone-contact-row">
                                <div className="phone-contact-avatar">
                                    <LayoutAvatarImageView
                                        figure={resolveAvatarFigure(friend.figure, friend.gender)}
                                        headOnly={true}
                                        compactHead={true}
                                        compactHeadSize={40}
                                        compactHeadPadding={0}
                                        direction={2}
                                    />
                                </div>

                                <button
                                    className="phone-contact-main"
                                    onClick={() => {
                                        const thread = getMessageThread(friend.id);

                                        if (thread) {
                                            setActiveThreadId(thread.threadId);
                                            openPhoneApp('messenger');
                                        }
                                    }}
                                >
                                    <strong>{contact?.nickname || friend.name}</strong>
                                    {contact?.nickname && <small>{friend.name}</small>}
                                    <span>{friend.online ? 'Online' : 'Offline'}</span>
                                </button>

                                <button
                                    className={`phone-contact-star${contact?.favourite ? ' active' : ''}`}
                                    title="Favourite"
                                    onClick={() => void toggleFavourite(friend.id)}
                                >
                                    <FaStar />
                                </button>

                                <button
                                    className="phone-contact-edit"
                                    onClick={() => void editContactNickname(friend.id, friend.name)}
                                >
                                    Nickname
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderPhoneApp = () => {
        switch (phoneApp) {
            case 'home':
                return renderPhoneHome();

            case 'notifications':
                return renderNotifications();

            case 'store':
                return renderStore();

            case 'settings':
                return renderSettings();

            case 'wallet':
                return renderWallet();

            case 'profile':
                return renderProfile();

            case 'contacts':
                return renderContacts();

            default:
                return null;
        }
    };

    if (!isVisible) return null;

    return (
        <>
        <DraggableWindow handleSelector=".messenger-drag" windowPosition={DraggableWindowPosition.TOP_CENTER} offsetTop={8}>
            <div className="messenger-window phone-messenger-window">
                <div className="messenger-drag" />
                <button className="messenger-minimize" onClick={() => setIsVisible(false)} />
                <div className="messenger-open-title">{LocalizeText('messenger.window.title', ['OPEN_CHAT_COUNT'], [visibleThreads.length.toString()])}</div>

                <button
                    type="button"
                    className="phone-system-button phone-home-button"
                    aria-label="Phone home"
                    title="Home"
                    onClick={() => openPhoneApp(phoneApp === 'home' ? 'messenger' : 'home')}
                >
                    <FaHome />
                </button>

                <button
                    type="button"
                    className="phone-system-button phone-lock-button"
                    aria-label="Lock phone"
                    title="Lock phone"
                    onClick={() => setPhoneLocked(true)}
                >
                    <FaLock />
                </button>

                {phoneApp !== 'messenger' && (
                    <div className="phone-app-overlay">
                        <div className="phone-app-topbar">
                            <button onClick={() => openPhoneApp('home')}>
                                <FaHome />
                            </button>

                            <strong>
                                {phoneApp === 'home'
                                    ? 'Phone'
                                    : phoneApp.charAt(0).toUpperCase() + phoneApp.slice(1)}
                            </strong>

                            <button onClick={() => openPhoneApp('messenger')}>
                                <FaComments />
                            </button>
                        </div>

                        {phoneError && (
                            <div className="phone-app-error">
                                {phoneError}
                                <button onClick={() => setPhoneError('')}>×</button>
                            </div>
                        )}

                        {phoneLoading && (
                            <div className="phone-app-loading">
                                Loading phone…
                            </div>
                        )}

                        {!phoneLoading && renderPhoneApp()}
                    </div>
                )}

                {phoneLocked && (
                    <div
                        className="phone-lock-screen"
                        onClick={() => {
                            setPhoneLocked(false);
                            setPhoneApp('home');
                        }}
                    >
                        <div className="phone-lock-time">
                            {new Date().toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </div>

                        <div className="phone-lock-date">
                            {new Date().toLocaleDateString([], {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long'
                            })}
                        </div>

                        <div className="phone-lock-profile">
                            <div className="phone-lock-avatar">
                                <LayoutAvatarImageView
                                    figure={phoneState?.profile?.figure || GetSessionDataManager().figure}
                                    headOnly={true}
                                    compactHead={true}
                                    compactHeadSize={54}
                                    compactHeadPadding={0}
                                    direction={2}
                                />
                            </div>

                            <strong>{phoneState?.profile?.username || GetSessionDataManager().userName}</strong>
                        </div>

                        <div className="phone-lock-notifications">
                            {phoneUnreadMessenger > 0 && (
                                <div>
                                    <FaComments />
                                    <span>
                                        <strong>Messenger</strong>
                                        {phoneUnreadMessenger} unread conversation{phoneUnreadMessenger === 1 ? '' : 's'}
                                    </span>
                                </div>
                            )}

                            {phoneUnreadNotifications > 0 && (
                                <div>
                                    <FaBell />
                                    <span>
                                        <strong>Notifications</strong>
                                        {phoneUnreadNotifications} new alert{phoneUnreadNotifications === 1 ? '' : 's'}
                                    </span>
                                </div>
                            )}

                            {phoneUnreadMessenger === 0 && phoneUnreadNotifications === 0 && (
                                <div className="phone-lock-clear">
                                    No new notifications
                                </div>
                            )}
                        </div>

                        <span className="phone-unlock-hint">
                            Click anywhere to unlock
                        </span>
                    </div>
                )}
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
                                {isActiveGroupConversation && (
                                    <button
                                        type="button"
                                        className="messenger-btn phone-group-manage-button"
                                        title="Group settings"
                                        aria-label="Group settings"
                                        onClick={() =>
                                            setGroupManagerVisible(
                                                (current) => !current
                                            )}
                                    >
                                        <FaEllipsisV />
                                    </button>
                                )}

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

                        {isActiveGroupConversation && groupManagerVisible && (
                            <div className="phone-group-manager">
                                <div className="phone-group-manager-header">
                                    <div>
                                        <strong>Group Settings</strong>
                                        <span>
                                            {activeThread.participant.name}
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setGroupManagerVisible(false)}
                                    >
                                        <FaTimes />
                                    </button>
                                </div>

                                {phoneError && (
                                    <div className="phone-group-manager-error">
                                        {phoneError}
                                    </div>
                                )}

                                <div className="phone-group-manager-actions">
                                    <button
                                        type="button"
                                        disabled={groupManagerBusy}
                                        onClick={() =>
                                            void renameActiveGroup()}
                                    >
                                        Rename Group
                                    </button>

                                    <button
                                        type="button"
                                        disabled={groupManagerBusy}
                                        onClick={() =>
                                            void muteActiveGroup()}
                                    >
                                        Mute
                                    </button>

                                    <button
                                        type="button"
                                        disabled={groupManagerBusy}
                                        onClick={() =>
                                            void unmuteActiveGroup()}
                                    >
                                        Unmute
                                    </button>
                                </div>

                                <div className="phone-group-add-member">
                                    <strong>Add Friend</strong>

                                    <input
                                        type="text"
                                        value={groupMemberSearch}
                                        placeholder="Search friends"
                                        onChange={(event) =>
                                            setGroupMemberSearch(
                                                event.target.value
                                            )}
                                    />

                                    <div className="phone-group-add-results">
                                        {friends
                                            .filter((friend) => {
                                                const query =
                                                    groupMemberSearch
                                                        .trim()
                                                        .toLowerCase();

                                                return (
                                                    friend.id > 0 &&
                                                    (!query ||
                                                        friend.name
                                                            .toLowerCase()
                                                            .includes(query))
                                                );
                                            })
                                            .slice(0, 8)
                                            .map((friend) => (
                                                <button
                                                    key={friend.id}
                                                    type="button"
                                                    disabled={groupManagerBusy}
                                                    onClick={() =>
                                                        void addFriendToActiveGroup(
                                                            friend.id
                                                        )}
                                                >
                                                    <LayoutAvatarImageView
                                                        figure={resolveAvatarFigure(
                                                            friend.figure,
                                                            friend.gender
                                                        )}
                                                        headOnly={true}
                                                        compactHead={true}
                                                        compactHeadSize={28}
                                                        compactHeadPadding={0}
                                                        direction={2}
                                                    />

                                                    <span>
                                                        <strong>
                                                            {friend.name}
                                                        </strong>
                                                        <small>
                                                            {friend.online
                                                                ? 'Online'
                                                                : 'Offline'}
                                                        </small>
                                                    </span>

                                                    <FaPlus />
                                                </button>
                                            ))}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    className="phone-group-leave"
                                    disabled={groupManagerBusy}
                                    onClick={() => void leaveActiveGroup()}
                                >
                                    Leave Group
                                </button>
                            </div>
                        )}

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
