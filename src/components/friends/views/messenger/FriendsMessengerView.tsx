import { AddLinkEventTracker, CreateMessengerGroupComposer, FollowFriendMessageComposer, GetSessionDataManager, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
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
import { GetUserProfile, LocalizeText, ReportType, SendMessageComposer, useHabbiconCatalog } from '../../../../api';
import { HabbiconsDmIcon } from '../../../../assets/images/habbicons';
import {
    getPhoneState,
    markPhoneNotificationRead,
    PhoneCatalogItem,
    PhoneMessengerReaction,
    PhoneState,
    purchasePhoneItem,
    purchasePhoneContract,
    setPhoneContractAutoPay,
    savePhoneContact,
    savePhoneSettings,
    managePhoneGroup,
    uploadPhoneFile
} from '../../../../api/phone/PhoneApi';
import { DraggableWindow, DraggableWindowPosition, LayoutAvatarImageView } from '../../../../common';
import { useFriends, useHelp, useMessenger, useTranslation } from '../../../../hooks';
import { ChatInputEmojiSelectorView } from '../../../room/widgets/chat-input/ChatInputEmojiSelectorView';
import { ChatInputGifSelectorView } from '../../../room/widgets/chat-input/ChatInputGifSelectorView';
import { isStaffChatIdentity } from '../../staffChatIdentity';
import { StaffChatFrankIconView } from '../../StaffChatFrankIconView';
import { resolveAvatarFigure } from '../friends-list/resolveAvatarFigure';
import './FriendsMessengerView.css';
import { FriendsMessengerHabbiconPickerView } from './FriendsMessengerHabbiconPickerView';
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
    const [replyingToMessageId, setReplyingToMessageId] = useState<number>(0);
    const [replyingToName, setReplyingToName] = useState<string>('');
    const [replyingToText, setReplyingToText] = useState<string>('');
    const [isHabbiconPickerVisible, setIsHabbiconPickerVisible] = useState(false);
    const habbiconCatalog = useHabbiconCatalog();
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
    const [phoneStoreTab, setPhoneStoreTab] = useState<
        'plans' | 'wallpaper' | 'theme' | 'case' | 'sound' | 'uploads'
    >('plans');
    const [phonePlanTerm, setPhonePlanTerm] = useState<number>(1);
    const [phoneContractBusy, setPhoneContractBusy] = useState(false);
    const [phoneUploadBusy, setPhoneUploadBusy] = useState<
        '' | 'wallpaper' | 'message_sound' | 'notification_sound'
    >('');
    const [groupManagerVisible, setGroupManagerVisible] = useState(false);
    const [groupManagerBusy, setGroupManagerBusy] = useState(false);
    const [groupMemberSearch, setGroupMemberSearch] = useState('');
    const {
        visibleThreads = [],
        activeThreadId = -1,
        activeThread = null,
        getMessageThread = null,
        sendMessage = null,
        sendHabbiconMessage,
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

    const clearReply = () => {
        setReplyingToMessageId(0);
        setReplyingToName('');
        setReplyingToText('');
    };

    const beginReply = (
        messageId: number,
        senderName: string,
        message: string
    ) => {
        if (!Number.isFinite(messageId) || messageId <= 0) return;

        setReplyingToMessageId(Math.floor(messageId));
        setReplyingToName(senderName || 'Message');
        setReplyingToText(message || '');
    };

    const send = async () => {
        if (!activeThread || !messageText.length) return;

        const phoneContract = phoneState?.contract;

        if (
            phoneContract &&
            (
                !phoneContract.active ||
                phoneContract.exhausted
            )
        ) {
            setPhoneError(
                phoneContract.exhausted
                    ? 'Your message allowance has been used. Open Phone Store > Plans.'
                    : 'You need an active phone contract to send messages. Open Phone Store > Plans.'
            );
            setPhoneStoreTab('plans');
            setPhoneApp('store');
            return;
        }

        stopTyping();

        const trimmedText = messageText.trimStart();
        const shouldTranslateOutgoing = settings.enabled && !!trimmedText.length && trimmedText.charAt(0) !== ':';

        if (!shouldTranslateOutgoing) {
            sendMessage(
                activeThread,
                GetSessionDataManager().userId,
                messageText,
                0,
                null,
                undefined,
                null,
                replyingToMessageId
            );

            setMessageText('');
            clearReply();
            return;
        }

        const translation = await translateOutgoing(messageText);

        if (translation && translation.translatedText?.length && translation.translatedText.length <= 255) {
            sendMessage(
                activeThread,
                GetSessionDataManager().userId,
                translation.translatedText,
                0,
                null,
                undefined,
                translation,
                replyingToMessageId
            );

            setMessageText('');
            clearReply();
            return;
        }

        sendMessage(
            activeThread,
            GetSessionDataManager().userId,
            messageText,
            0,
            null,
            undefined,
            null,
            replyingToMessageId
        );

        setMessageText('');
        clearReply();
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

        sendMessage(
            activeThread,
            GetSessionDataManager().userId,
            `[giphy:${gifId}]`,
            0,
            null,
            undefined,
            null,
            replyingToMessageId
        );

        clearReply();
    };

    const sendHabbicon = (habbiconId: number, keepOpen = false) => {
        if (!activeThread || habbiconId <= 0) return;

        stopTyping();
        sendHabbiconMessage(activeThread, habbiconId);

        if (!keepOpen) setIsHabbiconPickerVisible(false);
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
        clearReply();
    }, [activeThreadId]);

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

    const activePhoneGroup =
        activeGroupConversationId > 0
            ? phoneState?.messengerGroups?.find(
                (group) =>
                    group.conversationId ===
                    activeGroupConversationId
            ) || null
            : null;

    const activeGroupMemberIds = new Set(
        activePhoneGroup?.members?.map(
            (member) => member.userId
        ) || []
    );

    const activeGroupIsAdmin =
        activePhoneGroup?.myRole === 'admin';

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

    const changeActiveGroupAvatar = async () => {
        if (
            !isActiveGroupConversation ||
            !activeGroupIsAdmin
        ) return;

        const currentAvatar =
            activePhoneGroup?.avatarUrl || '';

        const avatarUrl = window.prompt(
            [
                'Group avatar',
                '',
                'Enter a hotel asset beginning /client/',
                'or a secure phone media path.',
                '',
                'Leave blank to remove the avatar.'
            ].join('\n'),
            currentAvatar
        );

        if (avatarUrl === null) return;

        const normalized = avatarUrl.trim();

        const validSecureMedia =
            /^\/api\/phone\/media\/[A-Fa-f0-9]{32}\.[A-Za-z0-9]{2,8}$/
                .test(normalized);

        if (
            normalized.length > 0 &&
            !normalized.startsWith('/client/') &&
            !validSecureMedia
        ) {
            setPhoneError(
                'Group avatars must use a hotel/client asset or secure phone upload.'
            );

            return;
        }

        await runGroupAction(
            'avatar',
            { avatarUrl: normalized }
        );
    };

    const muteActiveGroup = async () => {
        if (!isActiveGroupConversation) return;

        await runGroupAction('mute', { muted: true });
    };

    const unmuteActiveGroup = async () => {
        if (!isActiveGroupConversation) return;

        await runGroupAction('mute', { muted: false });
    };

    const changeActiveGroupTone = async (
        kind: 'message' | 'notification'
    ) => {
        if (!isActiveGroupConversation) return;

        const catalogSounds = (phoneState?.catalog || []).filter(
            (item) =>
                item.type === 'sound' &&
                (
                    item.price === 0 ||
                    (phoneState?.owned || []).includes(item.id)
                )
        );

        const uploadType =
            kind === 'message'
                ? 'message_sound'
                : 'notification_sound';

        const customSounds = (phoneState?.uploads || []).filter(
            (upload) => upload.uploadType === uploadType
        );

        const options = [
            `0 - Use default phone ${kind} tone`,
            ...catalogSounds.map(
                (item, index) =>
                    `${index + 1} - ${item.name}`
            ),
            ...customSounds.map(
                (upload, index) =>
                    `${catalogSounds.length + index + 1} - Custom: ${upload.originalFilename}`
            )
        ];

        const answer = window.prompt(
            `${kind === 'message' ? 'Message' : 'Notification'} tone for ${activeThread.participant.name}\n\n${options.join('\n')}`,
            '0'
        );

        if (answer === null) return;

        const selected =
            Number.parseInt(answer.trim(), 10);

        if (
            !Number.isFinite(selected) ||
            selected < 0 ||
            selected >
                catalogSounds.length + customSounds.length
        ) return;

        let soundKey: string | null = null;
        let customSoundId: number | null = null;

        if (
            selected > 0 &&
            selected <= catalogSounds.length
        ) {
            soundKey =
                catalogSounds[selected - 1].key;
        }
        else if (selected > catalogSounds.length) {
            const upload =
                customSounds[
                    selected - catalogSounds.length - 1
                ];

            if (!upload) return;

            customSoundId = upload.id;
        }

        const extra =
            kind === 'message'
                ? {
                    message_sound_key: soundKey,
                    custom_message_sound_id:
                        customSoundId,
                    notification_sound_key:
                        activePhoneGroup
                            ?.notificationSoundKey || null,
                    custom_notification_sound_id:
                        activePhoneGroup
                            ?.customNotificationSoundId || null
                }
                : {
                    message_sound_key:
                        activePhoneGroup
                            ?.messageSoundKey || null,
                    custom_message_sound_id:
                        activePhoneGroup
                            ?.customMessageSoundId || null,
                    notification_sound_key:
                        soundKey,
                    custom_notification_sound_id:
                        customSoundId
                };

        await runGroupAction('sound', extra);
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
            'add',
            { userId: friendId }
        );

        if (success) setGroupMemberSearch('');
    };


    const removeMemberFromActiveGroup = async (
        userId: number,
        username: string
    ) => {
        if (!activeGroupIsAdmin || userId <= 0) return;

        if (!window.confirm(
            `Remove ${username} from this group?`
        )) return;

        await runGroupAction(
            'remove',
            { userId }
        );
    };

    const setActiveGroupMemberAdmin = async (
        userId: number,
        username: string,
        makeAdmin: boolean
    ) => {
        if (!activeGroupIsAdmin || userId <= 0) return;

        const confirmation = makeAdmin
            ? `Make ${username} an admin?`
            : `Remove admin rights from ${username}?`;

        if (!window.confirm(confirmation)) return;

        await runGroupAction(
            'admin',
            {
                userId,
                admin: makeAdmin
            }
        );
    };

    const updateMessengerReactions = (
        messageId: number,
        nextReactions: PhoneMessengerReaction[]
    ) => {
        if (messageId <= 0) return;

        setPhoneState((current) => {
            if (!current) return current;

            return {
                ...current,
                reactions: [
                    ...(current.reactions || []).filter(
                        (entry) =>
                            entry.messageId !== messageId
                    ),
                    ...(nextReactions || [])
                ]
            };
        });
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

    const buyPhoneContract = async (planKey: string) => {
        if (phoneContractBusy) return;

        setPhoneError('');
        setPhoneContractBusy(true);

        try {
            await purchasePhoneContract(planKey, phonePlanTerm);
            await loadPhone(true);
        }
        catch (error) {
            setPhoneError(
                error instanceof Error
                    ? error.message
                    : 'Could not purchase phone contract.'
            );
        }
        finally {
            setPhoneContractBusy(false);
        }
    };

    const changePhoneAutoPay = async (autoPay: boolean) => {
        if (phoneContractBusy) return;

        setPhoneError('');
        setPhoneContractBusy(true);

        try {
            await setPhoneContractAutoPay(autoPay);
            await loadPhone(true);
        }
        catch (error) {
            setPhoneError(
                error instanceof Error
                    ? error.message
                    : 'Could not change renewal preference.'
            );
        }
        finally {
            setPhoneContractBusy(false);
        }
    };

    const equipPhoneSound = async (
        item: PhoneCatalogItem,
        target: 'message' | 'notification'
    ) => {
        if (!item || item.type !== 'sound') return;

        await updatePhoneSettings({
            [target === 'message'
                ? 'message_sound_key'
                : 'notification_sound_key']: item.key
        });

        await loadPhone(true);
    };

    const uploadPhoneCustomization = async (
        file: File | null,
        uploadType: 'wallpaper' | 'message_sound' | 'notification_sound'
    ) => {
        if (!file || phoneUploadBusy) return;

        setPhoneError('');
        setPhoneUploadBusy(uploadType);

        try {
            await uploadPhoneFile(file, uploadType);
            await loadPhone(true);
        } catch (error) {
            setPhoneError(
                error instanceof Error
                    ? error.message
                    : 'Could not upload phone media.'
            );
        } finally {
            setPhoneUploadBusy('');
        }
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
                current?.messageSoundKey || null,
                current?.customMessageSoundId || null
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
                current?.messageSoundKey || null,
                current?.customMessageSoundId || null
            );

            await loadPhone(true);
        } catch (error) {
            setPhoneError(error instanceof Error ? error.message : 'Could not save nickname.');
        }
    };

    const updateContactMessageTone = async (
        friendId: number,
        friendName: string
    ) => {
        const current = phoneState?.contacts?.find(
            (contact) => contact.userId === friendId
        );

        const ownedSoundItems = (phoneState?.catalog || []).filter(
            (item) =>
                item.type === 'sound' &&
                (
                    item.price === 0 ||
                    (phoneState?.owned || []).includes(item.id)
                )
        );

        const customSoundUploads = (phoneState?.uploads || []).filter(
            (upload) => upload.uploadType === 'message_sound'
        );

        const options = [
            '0 - Use default phone message tone',
            ...ownedSoundItems.map(
                (item, index) =>
                    `${index + 1} - ${item.name}`
            ),
            ...customSoundUploads.map(
                (upload, index) =>
                    `${ownedSoundItems.length + index + 1} - Custom: ${upload.originalFilename}`
            )
        ];

        const answer = window.prompt(
            `Message tone for ${friendName}\n\n${options.join('\n')}`,
            '0'
        );

        if (answer === null) return;

        const selected = Number.parseInt(answer.trim(), 10);

        if (
            !Number.isFinite(selected) ||
            selected < 0 ||
            selected > ownedSoundItems.length + customSoundUploads.length
        ) return;

        let messageSoundKey: string | null = null;
        let customMessageSoundId: number | null = null;

        if (
            selected > 0 &&
            selected <= ownedSoundItems.length
        ) {
            messageSoundKey =
                ownedSoundItems[selected - 1].key;
        }
        else if (selected > ownedSoundItems.length) {
            const upload =
                customSoundUploads[
                    selected - ownedSoundItems.length - 1
                ];

            if (!upload) return;

            customMessageSoundId = upload.id;
        }

        setPhoneError('');

        try {
            await savePhoneContact(
                friendId,
                !!current?.favourite,
                current?.nickname || null,
                messageSoundKey,
                customMessageSoundId
            );

            await loadPhone(true);
        }
        catch (error) {
            setPhoneError(
                error instanceof Error
                    ? error.message
                    : 'Could not update contact tone.'
            );
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
        const contract = phoneState?.contract;
        const tabs: Array<{
            key: 'plans' | 'wallpaper' | 'theme' | 'case' | 'sound' | 'uploads';
            label: string;
        }> = [
            { key: 'plans', label: 'Plans' },
            { key: 'wallpaper', label: 'Wallpapers' },
            { key: 'theme', label: 'Themes' },
            { key: 'case', label: 'Cases' },
            { key: 'sound', label: 'Sounds' },
            { key: 'uploads', label: 'Uploads' }
        ];

        const termLabels: Record<number, string> = {
            1: '1 month',
            2: '2 months',
            3: '3 months',
            6: '6 months',
            12: '1 year',
            24: '2 years'
        };

        const filteredCatalog =
            phoneStoreTab === 'plans' || phoneStoreTab === 'uploads'
                ? []
                : (phoneState?.catalog || []).filter(
                    (item) => item.type === phoneStoreTab
                );

        return (
            <div className="phone-app-page">
                <div className="phone-section-heading">
                    <div>
                        <strong>Phone Store</strong>
                        <span>Contracts, cosmetics, sounds and custom media</span>
                    </div>
                </div>

                <div className="phone-store-tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            className={phoneStoreTab === tab.key ? 'active' : ''}
                            onClick={() => setPhoneStoreTab(tab.key)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {phoneStoreTab === 'plans' && (
                    <div className="phone-contract-store">
                        {contract?.hasContract && (
                            <div className={`phone-contract-current${contract.active ? '' : ' expired'}`}>
                                <strong>
                                    {contract.active
                                        ? `${contract.planName || contract.planKey} Contract`
                                        : 'Contract expired'}
                                </strong>

                                {contract.active && (
                                    <>
                                        <span>
                                            {contract.unlimited
                                                ? 'Unlimited messages'
                                                : `${(contract.messagesRemaining ?? 0).toLocaleString()} / ${(contract.monthlyLimit ?? 0).toLocaleString()} messages remaining`}
                                        </span>

                                        <span>
                                            {contract.daysRemaining ?? 0} day(s) remaining
                                        </span>

                                        <span>
                                            Renewal: {contract.autoPay ? 'Auto Pay' : 'Manual'}
                                        </span>

                                        <label className="phone-contract-autopay">
                                            <input
                                                type="checkbox"
                                                checked={!!contract.autoPay}
                                                disabled={phoneContractBusy}
                                                onChange={(event) =>
                                                    void changePhoneAutoPay(
                                                        event.target.checked
                                                    )}
                                            />
                                            <span>
                                                Auto Pay at expiry
                                                {contract.renewalPrice
                                                    ? ` • ${contract.renewalPrice} Diamonds`
                                                    : ''}
                                            </span>
                                        </label>
                                    </>
                                )}
                            </div>
                        )}

                        {!contract?.active && (
                            <div className="phone-contract-required">
                                <strong>Phone contract required</strong>
                                <span>
                                    An active contract is required to send Messenger
                                    messages. Receiving messages remains free.
                                </span>
                                <span>
                                    Your first contract payment is always manual.
                                    Auto Pay can be enabled after purchase.
                                </span>
                            </div>
                        )}

                        {!contract?.active && (
                            <label className="phone-contract-term">
                                <span>Contract term</span>
                                <select
                                    value={phonePlanTerm}
                                    onChange={(event) =>
                                        setPhonePlanTerm(
                                            Number(event.target.value)
                                        )}
                                >
                                    {[1, 2, 3, 6, 12, 24].map((term) => (
                                        <option key={term} value={term}>
                                            {termLabels[term]}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        )}

                        <div className="phone-contract-grid">
                            {(phoneState?.contractPlans || []).map((plan) => {
                                const price =
                                    plan.prices?.[String(phonePlanTerm)] ?? 0;

                                return (
                                    <div
                                        key={plan.key}
                                        className={`phone-contract-card${plan.unlimited ? ' unlimited' : ''}`}
                                    >
                                        <strong>{plan.name}</strong>
                                        <p>{plan.description}</p>

                                        <b>
                                            {plan.unlimited
                                                ? 'Unlimited'
                                                : `${plan.monthlyLimit.toLocaleString()} messages / month`}
                                        </b>

                                        <span className="phone-contract-price">
                                            {price.toLocaleString()} Diamonds
                                        </span>

                                        <small>
                                            {termLabels[phonePlanTerm]}
                                        </small>

                                        {!contract?.active && (
                                            <button
                                                type="button"
                                                disabled={phoneContractBusy}
                                                onClick={() =>
                                                    void buyPhoneContract(plan.key)}
                                            >
                                                {phoneContractBusy
                                                    ? 'Processing…'
                                                    : 'Buy Contract'}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {phoneStoreTab === 'uploads' && (
                    <div className="phone-upload-store-card">
                        <strong>Custom Phone Media</strong>
                        <p>
                            Custom wallpaper, custom message tones and custom
                            notification tones cost{' '}
                            <b>
                                {phoneState?.uploadPriceDiamonds ?? 20} Diamonds
                            </b>{' '}
                            per successful upload.
                        </p>
                        <span>
                            Invalid files are validated before payment is taken.
                        </span>
                        <button
                            type="button"
                            onClick={() => openPhoneApp('settings')}
                        >
                            Manage Uploads
                        </button>
                    </div>
                )}

                {filteredCatalog.length > 0 && (
                    <div className="phone-store-grid">
                        {filteredCatalog.map((item) => {
                            const itemOwned =
                                item.price === 0 || owned.has(item.id);

                            const messageEquipped =
                                item.type === 'sound' &&
                                phoneState?.settings?.message_sound_key === item.key;

                            const notificationEquipped =
                                item.type === 'sound' &&
                                phoneState?.settings?.notification_sound_key === item.key;

                            const equipped =
                                phoneState?.settings?.wallpaper_key === item.key ||
                                phoneState?.settings?.theme_key === item.key ||
                                phoneState?.settings?.case_key === item.key ||
                                messageEquipped ||
                                notificationEquipped;

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
                                                    {item.price}{' '}
                                                    {item.currencyType < 0
                                                        ? 'Credits'
                                                        : 'Diamonds'}
                                                </span>

                                                <button
                                                    disabled={phoneBusyItemId !== 0}
                                                    onClick={() =>
                                                        void buyPhoneItem(item)}
                                                >
                                                    {phoneBusyItemId === item.id
                                                        ? 'Buying…'
                                                        : 'Buy'}
                                                </button>
                                            </>
                                        ) : item.type === 'sound' ? (
                                            <div className="phone-sound-equip-actions">
                                                <button
                                                    type="button"
                                                    className={messageEquipped ? 'active' : ''}
                                                    onClick={() =>
                                                        void equipPhoneSound(
                                                            item,
                                                            'message'
                                                        )}
                                                >
                                                    {messageEquipped
                                                        ? 'Message ✓'
                                                        : 'Use for Message'}
                                                </button>

                                                <button
                                                    type="button"
                                                    className={notificationEquipped ? 'active' : ''}
                                                    onClick={() =>
                                                        void equipPhoneSound(
                                                            item,
                                                            'notification'
                                                        )}
                                                >
                                                    {notificationEquipped
                                                        ? 'Notification ✓'
                                                        : 'Use for Notification'}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        previewPhoneSound(
                                                            item.key,
                                                            'message'
                                                        )}
                                                >
                                                    Preview
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="phone-owned-label">
                                                    {equipped ? 'Equipped' : 'Owned'}
                                                </span>

                                                {!equipped && (
                                                    <button
                                                        onClick={() =>
                                                            void equipPhoneItem(item)}
                                                    >
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
                )}
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

            <div className="phone-custom-upload-settings">
                <div className="phone-section-heading">
                    <div>
                        <strong>Custom Phone Media</strong>
                        <span>
                            Upload custom phone media • 20 Diamonds per successful upload
                        </span>
                    </div>
                </div>

                <label className="phone-custom-upload-row">
                    <div>
                        <strong>Custom wallpaper</strong>
                        <span>
                            Image, maximum 2 MB. Images are validated and
                            converted by the hotel.
                        </span>
                    </div>

                    <span className="phone-custom-upload-button">
                        {phoneUploadBusy === 'wallpaper'
                            ? 'Uploading...'
                            : 'Choose image'}

                        <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif"
                            disabled={!!phoneUploadBusy}
                            onChange={(event) => {
                                const file = event.currentTarget.files?.[0] || null;

                                event.currentTarget.value = '';

                                void uploadPhoneCustomization(
                                    file,
                                    'wallpaper'
                                );
                            }}
                        />
                    </span>
                </label>

                <label className="phone-custom-upload-row">
                    <div>
                        <strong>Custom message tone</strong>
                        <span>
                            WAV audio, maximum 10 seconds and 2 MB.
                        </span>
                    </div>

                    <span className="phone-custom-upload-button">
                        {phoneUploadBusy === 'message_sound'
                            ? 'Uploading...'
                            : 'Choose WAV'}

                        <input
                            type="file"
                            accept=".wav,audio/wav,audio/x-wav"
                            disabled={!!phoneUploadBusy}
                            onChange={(event) => {
                                const file = event.currentTarget.files?.[0] || null;

                                event.currentTarget.value = '';

                                void uploadPhoneCustomization(
                                    file,
                                    'message_sound'
                                );
                            }}
                        />
                    </span>
                </label>

                <label className="phone-custom-upload-row">
                    <div>
                        <strong>Custom notification tone</strong>
                        <span>
                            WAV audio, maximum 10 seconds and 2 MB.
                        </span>
                    </div>

                    <span className="phone-custom-upload-button">
                        {phoneUploadBusy === 'notification_sound'
                            ? 'Uploading...'
                            : 'Choose WAV'}

                        <input
                            type="file"
                            accept=".wav,audio/wav,audio/x-wav"
                            disabled={!!phoneUploadBusy}
                            onChange={(event) => {
                                const file = event.currentTarget.files?.[0] || null;

                                event.currentTarget.value = '';

                                void uploadPhoneCustomization(
                                    file,
                                    'notification_sound'
                                );
                            }}
                        />
                    </span>
                </label>
            </div>

            <div className="phone-sound-settings">
                <div className="phone-section-heading">
                    <div>
                        <strong>Phone Sounds</strong>
                        <span>Preview your equipped message and notification tones</span>
                    </div>
                </div>

                <div className="phone-sound-row">
                    <div>
                        <strong>Message tone</strong>
                        <span>{equippedMessageSound}</span>
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            previewPhoneSound(
                                equippedMessageSound,
                                'message',
                                customMessageSoundUpload?.publicUrl
                            )}
                    >
                        Preview
                    </button>
                </div>

                <div className="phone-sound-row">
                    <div>
                        <strong>Notification tone</strong>
                        <span>{equippedNotificationSound}</span>
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            previewPhoneSound(
                                equippedNotificationSound,
                                'notification',
                                customNotificationSoundUpload?.publicUrl
                            )}
                    >
                        Preview
                    </button>
                </div>

                {phoneState?.settings?.dnd_enabled && (
                    <div className="phone-dnd-notice">
                        Do Not Disturb is enabled. Automatic phone sounds
                        will remain silenced.
                    </div>
                )}
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

                <span>
                    Message Tone
                    <b>{equippedMessageSound}</b>
                </span>

                <span>
                    Notification Tone
                    <b>{equippedNotificationSound}</b>
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

                                <button
                                    className="phone-contact-tone"
                                    title="Message tone"
                                    onClick={() =>
                                        void updateContactMessageTone(
                                            friend.id,
                                            friend.name
                                        )}
                                >
                                    Tone
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

    const equippedWallpaper =
        phoneState?.settings?.wallpaper_key || 'wallpaper_default';

    const equippedTheme =
        phoneState?.settings?.theme_key || 'theme_dark';

    const equippedCase =
        phoneState?.settings?.case_key || 'case_black';

    const equippedMessageSound =
        phoneState?.settings?.message_sound_key || 'sound_classic_ping';

    const equippedNotificationSound =
        phoneState?.settings?.notification_sound_key || 'sound_soft_bell';

    const customWallpaperUpload =
        phoneState?.uploads?.find(
            (upload) =>
                upload.id === phoneState?.settings?.custom_wallpaper_id &&
                upload.uploadType === 'wallpaper'
        ) || null;

    const customMessageSoundUpload =
        phoneState?.uploads?.find(
            (upload) =>
                upload.id === phoneState?.settings?.custom_message_sound_id &&
                upload.uploadType === 'message_sound'
        ) || null;

    const customNotificationSoundUpload =
        phoneState?.uploads?.find(
            (upload) =>
                upload.id === phoneState?.settings?.custom_notification_sound_id &&
                upload.uploadType === 'notification_sound'
        ) || null;

    const phoneShellClasses = [
        'messenger-window',
        'phone-messenger-window',
        `phone-wallpaper-${ equippedWallpaper.replace('wallpaper_', '') }`,
        `phone-theme-${ equippedTheme.replace('theme_', '') }`,
        `phone-case-${ equippedCase.replace('case_', '') }`,
        phoneState?.settings?.dnd_enabled ? 'phone-dnd-enabled' : ''
    ].filter(Boolean).join(' ');

    const phoneShellStyle = customWallpaperUpload?.publicUrl
        ? ({
            '--phone-wallpaper':
                `url("${customWallpaperUpload.publicUrl}")`
        } as React.CSSProperties)
        : undefined;

    const phoneSoundAsset = (
        key: string,
        kind: 'message' | 'notification' = 'message'
    ) => {
        const rawKey = String(key || '');

        const seasonalMatch = rawKey.match(
            /^sound_(christmas|halloween|valentines|easter|summer|winter|autumn|newyear|pride|retro_hotel|spring|stpatricks)_(?:message|notification)$/
        );

        if (seasonalMatch) {
            return `/client/phone/sounds/${ kind }/${ seasonalMatch[1] }.wav`;
        }

        const normalized = rawKey
            .replace(/^sound_/, '')
            .replaceAll('_', '-')
            .replace(/[^a-z0-9-]/gi, '');

        if (!normalized) return '';

        return `/client/phone/sounds/${ kind }/${ normalized }.mp3`;
    };

    const previewPhoneSound = (
        key: string,
        kind: 'message' | 'notification' = 'message',
        customUrl?: string
    ) => {
        const src = customUrl || phoneSoundAsset(key, kind);

        if (!src) return;

        try {
            const audio = new Audio(src);

            audio.volume = 0.65;

            void audio.play().catch(() => {
                setPhoneError(
                    `No preview audio is installed yet for ${ key }.`
                );
            });
        } catch {
            setPhoneError('Could not preview this sound.');
        }
    };

    if (!isVisible) return null;

    return (
        <>
        <DraggableWindow handleSelector=".messenger-drag" windowPosition={DraggableWindowPosition.TOP_CENTER} offsetTop={8}>
            <div
                className={phoneShellClasses}
                style={phoneShellStyle}
            >
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

                                {activePhoneGroup?.avatarUrl && (
                                    <div className="phone-group-avatar-box">
                                        <img
                                            className="phone-group-avatar-preview"
                                            src={activePhoneGroup.avatarUrl}
                                            alt=""
                                        />

                                        <span>Group avatar</span>
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

                                    {activeGroupIsAdmin && (
                                        <button
                                            type="button"
                                            disabled={groupManagerBusy}
                                            onClick={() =>
                                                void changeActiveGroupAvatar()}
                                        >
                                            Group Avatar
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        disabled={groupManagerBusy}
                                        onClick={() =>
                                            void changeActiveGroupTone(
                                                'message'
                                            )}
                                    >
                                        Message Tone
                                    </button>

                                    <button
                                        type="button"
                                        disabled={groupManagerBusy}
                                        onClick={() =>
                                            void changeActiveGroupTone(
                                                'notification'
                                            )}
                                    >
                                        Alert Tone
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

                                                                <div className="phone-group-tone-status">
                                    <span>
                                        <strong>Message tone</strong>
                                        <small>
                                            {activePhoneGroup?.customMessageSoundId
                                                ? 'Custom'
                                                : activePhoneGroup?.messageSoundKey ||
                                                    'Phone default'}
                                        </small>
                                    </span>

                                    <span>
                                        <strong>Alert tone</strong>
                                        <small>
                                            {activePhoneGroup?.customNotificationSoundId
                                                ? 'Custom'
                                                : activePhoneGroup?.notificationSoundKey ||
                                                    'Phone default'}
                                        </small>
                                    </span>
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
                                                    !activeGroupMemberIds.has(
                                                        friend.id
                                                    ) &&
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

                                <div className="phone-group-members">
                                    <div className="phone-group-members-title">
                                        <strong>Members</strong>
                                        <span>
                                            {activePhoneGroup?.members?.length || 0}/20
                                        </span>
                                    </div>

                                    {!activePhoneGroup && (
                                        <div className="phone-group-members-empty">
                                            Group member data is loading.
                                        </div>
                                    )}

                                    {activePhoneGroup &&
                                        !activePhoneGroup.members.length && (
                                            <div className="phone-group-members-empty">
                                                No active members found.
                                            </div>
                                        )}

                                    {activePhoneGroup?.members?.map(
                                        (member) => {
                                            const isSelf =
                                                member.userId ===
                                                GetSessionDataManager().userId;

                                            return (
                                                <div
                                                    key={member.userId}
                                                    className="phone-group-member-row"
                                                >
                                                    <LayoutAvatarImageView
                                                        figure={member.figure}
                                                        headOnly={true}
                                                        compactHead={true}
                                                        compactHeadSize={30}
                                                        compactHeadPadding={0}
                                                        direction={2}
                                                    />

                                                    <div className="phone-group-member-info">
                                                        <strong>
                                                            {member.username}
                                                            {isSelf ? ' (You)' : ''}
                                                        </strong>

                                                        <span
                                                            className={
                                                                `phone-group-member-role ${member.role}`
                                                            }
                                                        >
                                                            {member.role === 'admin'
                                                                ? 'Admin'
                                                                : 'Member'}
                                                        </span>
                                                    </div>

                                                    {activeGroupIsAdmin &&
                                                        !isSelf && (
                                                            <div className="phone-group-member-actions">
                                                                {member.role === 'admin' ? (
                                                                    <button
                                                                        type="button"
                                                                        disabled={groupManagerBusy}
                                                                        onClick={() =>
                                                                            void setActiveGroupMemberAdmin(
                                                                                member.userId,
                                                                                member.username,
                                                                                false
                                                                            )}
                                                                    >
                                                                        Remove Admin
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        disabled={groupManagerBusy}
                                                                        onClick={() =>
                                                                            void setActiveGroupMemberAdmin(
                                                                                member.userId,
                                                                                member.username,
                                                                                true
                                                                            )}
                                                                    >
                                                                        Make Admin
                                                                    </button>
                                                                )}

                                                                <button
                                                                    type="button"
                                                                    className="danger"
                                                                    disabled={groupManagerBusy}
                                                                    onClick={() =>
                                                                        void removeMemberFromActiveGroup(
                                                                            member.userId,
                                                                            member.username
                                                                        )}
                                                                >
                                                                    Remove
                                                                </button>
                                                            </div>
                                                        )}
                                                </div>
                                            );
                                        }
                                    )}
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
                            <FriendsMessengerThreadView
                                thread={activeThread}
                                reactions={phoneState?.reactions || []}
                                onReactionUpdate={updateMessengerReactions}
                                onReply={beginReply}
                            />
                        </div>

                        {activeThread.participant && activeThread.participant.id > 0 && typingUserIds.indexOf(activeThread.participant.id) >= 0 && (
                            <div className="messenger-typing-indicator">
                                {LocalizeText('messenger.typing', ['FRIEND_NAME'], [activeThread.participant.name])}
                            </div>
                        )}

                        {replyingToMessageId > 0 && (
                            <div className="phone-reply-composer">
                                <div className="phone-reply-composer-content">
                                    <strong>
                                        Replying to {replyingToName}
                                    </strong>

                                    <span>
                                        {replyingToText || 'Message'}
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    title="Cancel reply"
                                    aria-label="Cancel reply"
                                    onClick={clearReply}
                                >
                                    <FaTimes />
                                </button>
                            </div>
                        )}

                        <div className="messenger-input-row phone-composer">
                            <div className="phone-composer-media">
                                <ChatInputEmojiSelectorView addChatEmoji={addMessageEmoji} />
                                <ChatInputGifSelectorView sendGif={sendGif} />

                                <button
                                    type="button"
                                    className="messenger-btn habbicon"
                                    aria-label={LocalizeText('messenger.habbicons.tooltip')}
                                    onClick={() => setIsHabbiconPickerVisible((value) => !value)}
                                >
                                    <img alt="" src={HabbiconsDmIcon} />
                                </button>
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

                        {isHabbiconPickerVisible && (
                            <FriendsMessengerHabbiconPickerView
                                onClose={() => setIsHabbiconPickerVisible(false)}
                                onOpenHub={() => {
                                    setIsHabbiconPickerVisible(false);
                                    habbiconCatalog.setBookVisible(true);
                                }}
                                onSelect={sendHabbicon}
                            />
                        )}
                    </>
                )}
            </div>
        </DraggableWindow>
        </>
    );
};
