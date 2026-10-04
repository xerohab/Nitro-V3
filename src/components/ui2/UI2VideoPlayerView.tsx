import {
    ControlYoutubeDisplayPlaybackMessageComposer,
    YouTubeRoomBroadcastEvent,
    YouTubeRoomPlayComposer,
    YouTubeRoomSettingsEvent,
    YouTubeRoomWatchersEvent,
    YouTubeRoomWatchingComposer
} from '@octane/renderer';
import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { GetRoomSession, LocalizeText, SendMessageComposer, YoutubeVideoPlaybackStateEnum } from '../../api';
import { LayoutAvatarImageView, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../common';
import { useFurnitureYoutubeWidget, useHasPermission, useMessageEvent } from '../../hooks';
import ReactPlayer from '../youtube/YoutubeReactPlayer';

const CONTROL_COMMAND_PREVIOUS_VIDEO = 0;
const CONTROL_COMMAND_NEXT_VIDEO = 1;
const CONTROL_COMMAND_PAUSE_VIDEO = 2;
const CONTROL_COMMAND_CONTINUE_VIDEO = 3;

type MediaKind = 'youtube' | 'vimeo' | 'direct' | 'unknown';

interface MediaSource
{
    raw: string;
    src: string;
    roomValue: string;
    kind: MediaKind;
    valid: boolean;
}

const YOUTUBE_ID = /^[a-zA-Z0-9_-]{11}$/;

const resolveMediaSource = (value: string): MediaSource =>
{
    const raw = value.trim();

    if(!raw)
    {
        return {
            raw,
            src: '',
            roomValue: '',
            kind: 'unknown',
            valid: false
        };
    }

    if(YOUTUBE_ID.test(raw))
    {
        return {
            raw,
            src: `https://www.youtube.com/watch?v=${ raw }`,
            roomValue: raw,
            kind: 'youtube',
            valid: true
        };
    }

    const youtubePatterns = [
        /(?:youtube\.com\/watch\?(?:.*&)?v=)([a-zA-Z0-9_-]{11})/i,
        /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/i,
        /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/i,
        /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/i,
        /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/i
    ];

    for(const pattern of youtubePatterns)
    {
        const match = raw.match(pattern);

        if(match)
        {
            return {
                raw,
                src: `https://www.youtube.com/watch?v=${ match[1] }`,
                roomValue: match[1],
                kind: 'youtube',
                valid: true
            };
        }
    }

    if(/^https?:\/\/(?:www\.)?vimeo\.com\/\d+(?:[/?#].*)?$/i.test(raw) ||
       /^https?:\/\/player\.vimeo\.com\/video\/\d+(?:[/?#].*)?$/i.test(raw))
    {
        return {
            raw,
            src: raw,
            roomValue: raw,
            kind: 'vimeo',
            valid: true
        };
    }

    if(/^https?:\/\/.+/i.test(raw))
    {
        return {
            raw,
            src: raw,
            roomValue: raw,
            kind: 'direct',
            valid: true
        };
    }

    return {
        raw,
        src: '',
        roomValue: '',
        kind: 'unknown',
        valid: false
    };
};

const friendlyVideoTitle = (value: string) =>
{
    if(!value) return 'Untitled video';

    try
    {
        const url = new URL(value);

        let title =
            decodeURIComponent(
                url.pathname.split('/').filter(Boolean).pop() || ''
            );

        title = title
            .replace(/\.(mp4|mov|webm|m4v|mkv)$/i, '')
            .replace(/\b(2160p|1080p|720p|480p)\b/gi, ' ')
            .replace(/\b(BRRip|BluRay|WEBRip|WEB-DL|DVDRip|HDRip)\b/gi, ' ')
            .replace(/\b(x264|x265|h264|h265|HEVC|AVC)\b/gi, ' ')
            .replace(/\b(YIFY|YTS|Deceit)\b/gi, ' ')
            .replace(/[._-]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        if(title)
        {
            return title
                .split(' ')
                .filter(Boolean)
                .map(word =>
                {
                    if(/^\d{4}$/.test(word))
                    {
                        return `(${ word })`;
                    }

                    return word.charAt(0).toUpperCase() +
                        word.slice(1);
                })
                .join(' ');
        }
    }
    catch(e)
    {
        // Use fallback below.
    }

    return 'Untitled video';
};

const sourceLabel = (kind: MediaKind) =>
{
    switch(kind)
    {
        case 'youtube':
            return 'YouTube';

        case 'vimeo':
            return 'Vimeo';

        case 'direct':
            return 'Direct video';

        default:
            return 'Video';
    }
};

export const UI2VideoPlayerView: FC<{}> = () =>
{
    const [ isOpen, setIsOpen ] = useState(false);
    const [ tab, setTab ] = useState<'player' | 'playlist' | 'spectators' | 'settings' | 'history'>('player');
    const [ inputValue, setInputValue ] = useState('');
    const [ activeMedia, setActiveMedia ] = useState('');
    const [ volume, setVolume ] = useState(100);
    const [ isMuted, setIsMuted ] = useState(false);
    const [ isFullscreen, setIsFullscreen ] = useState(false);
    const [ isLooping, setIsLooping ] = useState(false);
    const [ isLocallyPlaying, setIsLocallyPlaying ] = useState(true);
    const [ volumePreset, setVolumePreset ] = useState<number>(100);
    const [ playlist, setPlaylist ] = useState<string[]>([]);
    const [ history, setHistory ] = useState<string[]>([]);
    const [ showVolumeSlider, setShowVolumeSlider ] = useState(true);
    const [ broadcastVideo, setBroadcastVideo ] = useState('');
    const [ broadcastSender, setBroadcastSender ] = useState('');
    const [ watcherIds, setWatcherIds ] = useState<Set<number>>(new Set());
    const playerRef = useRef<HTMLVideoElement | null>(null);
    const videoScreenRef = useRef<HTMLDivElement | null>(null);

    const {
        objectId: youtubeObjectId,
        videoId: roomVideoId,
        currentVideoState,
        hasControl
    } = useFurnitureYoutubeWidget();

    const isModerator = useHasPermission('acc_anyroomowner');

    /*
     * We still listen to the old room-setting packet because the
     * emulator may send it. UI2 no longer uses that flag to hide
     * the Video Player.
     */
    useMessageEvent<YouTubeRoomSettingsEvent>(
        YouTubeRoomSettingsEvent,
        () => undefined
    );

    useMessageEvent<YouTubeRoomBroadcastEvent>(
        YouTubeRoomBroadcastEvent,
        event =>
        {
            const parser = event.getParser();
            const next = parser.videoId || '';

            /*
             * :videoplayer uses the existing room-media packet with
             * a reserved signal. Open the window without replacing
             * or interrupting whatever is currently playing.
             */
            if(next === '__SOLACE_VIDEO_PLAYER_OPEN__')
            {
                setIsOpen(true);
                setTab('player');
                return;
            }

            setBroadcastVideo(next);
            setBroadcastSender(parser.senderName || '');

            if(next)
            {
                setInputValue(next);
                setActiveMedia(next);
                setIsOpen(true);
                setTab('player');
            }
            else
            {
                setBroadcastVideo('');
                setBroadcastSender('');
                setActiveMedia('');
            }
        }
    );

    const loadRoomUsers = () =>
    {
        /*
         * Watcher IDs are resolved directly when rendering the
         * spectators tab, so no second users cache is necessary.
         */
    };

    useMessageEvent<YouTubeRoomWatchersEvent>(
        YouTubeRoomWatchersEvent,
        event =>
        {
            setWatcherIds(new Set(event.getParser().watcherIds));
            loadRoomUsers();
        }
    );

    const roomSession = GetRoomSession();
    const isMyRoom = !!(isModerator || roomSession?.isRoomOwner);
    const canManage = !!(isMyRoom || hasControl);

    const currentMedia = useMemo(
        () => resolveMediaSource(activeMedia || inputValue),
        [ activeMedia, inputValue ]
    );

    // SOLACE_UI2_AUTOPLAY
    useEffect(() =>
    {
        if(!currentMedia.valid) return;

        /*
         * Provider video needs muted autoplay because browsers
         * commonly block audible autoplay.
         *
         * Direct HTML5 video keeps the user's current mute state.
         */
        if(
            currentMedia.kind === 'youtube' ||
            currentMedia.kind === 'vimeo'
        )
        {
            setIsMuted(true);
        }

        setIsLocallyPlaying(true);
    }, [
        currentMedia.kind,
        currentMedia.src,
        currentMedia.valid
    ]);

    const sentWatchingRef = useRef(false);

    useEffect(() =>
    {
        if(currentMedia.valid && !sentWatchingRef.current)
        {
            try
            {
                SendMessageComposer(
                    new YouTubeRoomWatchingComposer(true)
                );
            }
            catch(e)
            {
                // Keep local playback alive if room tracking fails.
            }

            sentWatchingRef.current = true;
        }
        else if(!currentMedia.valid &&
            sentWatchingRef.current)
        {
            try
            {
                SendMessageComposer(
                    new YouTubeRoomWatchingComposer(false)
                );
            }
            catch(e)
            {
                // Ignore room watcher cleanup failure.
            }

            sentWatchingRef.current = false;
        }
    }, [ currentMedia.valid ]);

    useEffect(() =>
    {
        if(roomVideoId)
        {
            setInputValue(roomVideoId);
            setActiveMedia(roomVideoId);
        }
    }, [ roomVideoId ]);

    useEffect(() =>
    {
        const handler = () => setIsOpen(value => !value);

        window.addEventListener('youtube:toggle', handler);

        return () =>
            window.removeEventListener('youtube:toggle', handler);
    }, []);

    useEffect(() =>
    {
        localStorage.removeItem('youtube_history');

        const savedPlaylist =
            localStorage.getItem('youtube_playlist');

        if(savedPlaylist)
        {
            try
            {
                const parsed = JSON.parse(savedPlaylist);

                if(Array.isArray(parsed))
                {
                    setPlaylist(
                        parsed
                            .map((entry: any) =>
                                typeof entry === 'string'
                                    ? entry
                                    : entry?.id)
                            .filter(Boolean)
                    );
                }
            }
            catch(e)
            {
                // Ignore invalid legacy local storage.
            }
        }
    }, []);


    useEffect(() =>
    {
        localStorage.setItem(
            'youtube_playlist',
            JSON.stringify(playlist)
        );
    }, [ playlist ]);

    const addToHistory = (_value: string) =>
    {
        // History intentionally disabled for privacy.
    };

    const broadcast = (value: string) =>
    {
        const media = resolveMediaSource(value);

        if(!media.valid || !canManage) return;

        try
        {
            SendMessageComposer(
                new YouTubeRoomPlayComposer(
                    media.roomValue,
                    playlist.map(item =>
                        resolveMediaSource(item).roomValue || item)
                )
            );
        }
        catch(e)
        {
            /*
             * Local playback remains available if the emulator
             * rejects a non-YouTube source.
             */
        }
    };

    const playMedia = (value: string) =>
    {
        const media = resolveMediaSource(value);

        if(!media.valid) return;

        setInputValue(value);
        setActiveMedia(value);
        addToHistory(value);

        /*
         * No separate Broadcast button:
         * an authorised room controller automatically publishes
         * the selected media.
         */
        if(canManage) broadcast(value);
    };

    const stopRoomVideo = () =>
    {
        if(!canManage) return;

        try
        {
            SendMessageComposer(
                new YouTubeRoomPlayComposer('', [])
            );
        }
        catch(e)
        {
            // Local state is still cleared below.
        }

        setBroadcastVideo('');
        setBroadcastSender('');
        setActiveMedia('');
        setInputValue('');
    };

    const handlePlay = () =>
    {
        if(youtubeObjectId &&
            youtubeObjectId !== -1 &&
            hasControl)
        {
            SendMessageComposer(
                new ControlYoutubeDisplayPlaybackMessageComposer(
                    youtubeObjectId,
                    CONTROL_COMMAND_CONTINUE_VIDEO
                )
            );
        }
    };

    const handlePause = () =>
    {
        if(youtubeObjectId &&
            youtubeObjectId !== -1 &&
            hasControl)
        {
            SendMessageComposer(
                new ControlYoutubeDisplayPlaybackMessageComposer(
                    youtubeObjectId,
                    CONTROL_COMMAND_PAUSE_VIDEO
                )
            );
        }
    };

    const handlePrev = () =>
    {
        if(youtubeObjectId &&
            youtubeObjectId !== -1 &&
            hasControl)
        {
            SendMessageComposer(
                new ControlYoutubeDisplayPlaybackMessageComposer(
                    youtubeObjectId,
                    CONTROL_COMMAND_PREVIOUS_VIDEO
                )
            );
        }
    };

    const handleNext = () =>
    {
        if(youtubeObjectId &&
            youtubeObjectId !== -1 &&
            hasControl)
        {
            SendMessageComposer(
                new ControlYoutubeDisplayPlaybackMessageComposer(
                    youtubeObjectId,
                    CONTROL_COMMAND_NEXT_VIDEO
                )
            );
        }
    };

    const addToPlaylist = () =>
    {
        const media = resolveMediaSource(inputValue);

        if(!media.valid || !canManage) return;

        if(!playlist.includes(inputValue))
        {
            setPlaylist(previous =>
                [ ...previous, inputValue ]);
        }
    };

    /*
     * Do not unmount the player when the window is closed.
     * The hidden player remains mounted so room media continues.
     */

    const isPlaying =
        currentVideoState ===
        YoutubeVideoPlaybackStateEnum.PLAYING;

    const isPaused =
        currentVideoState ===
        YoutubeVideoPlaybackStateEnum.PAUSED;

    // SOLACE_VIDEO_NO_DOWNLOAD
    useEffect(() =>
    {
        if(currentMedia.kind !== 'direct') return;

        const applyDirectVideoRestrictions = () =>
        {
            const video = playerRef.current;

            if(!video) return;

            video.setAttribute(
                'controlsList',
                'nodownload'
            );

            video.setAttribute(
                'disablePictureInPicture',
                'true'
            );

            video.addEventListener(
                'contextmenu',
                event => event.preventDefault(),
                { once: true }
            );
        };

        const timer = window.setTimeout(
            applyDirectVideoRestrictions,
            100
        );

        return () =>
        {
            window.clearTimeout(timer);
        };
    }, [ currentMedia.kind, currentMedia.src ]);

    // SOLACE_VIDEO_FULLSCREEN_SYNC
    useEffect(() =>
    {
        const handleFullscreenChange = () =>
        {
            setIsFullscreen(
                document.fullscreenElement === videoScreenRef.current
            );
        };

        document.addEventListener(
            'fullscreenchange',
            handleFullscreenChange
        );

        return () =>
        {
            document.removeEventListener(
                'fullscreenchange',
                handleFullscreenChange
            );
        };
    }, []);

    const toggleVideoFullscreen = async () =>
    {
        const screen = videoScreenRef.current;

        if(!screen) return;

        try
        {
            if(document.fullscreenElement)
            {
                await document.exitFullscreen();
                return;
            }

            /*
             * For a direct HTML5 video use the actual rendered
             * <video>. This gives the browser its native
             * fullscreen video experience.
             */
            if(currentMedia.kind === 'direct')
            {
                const video =
                    screen.querySelector('video') as
                        (HTMLVideoElement & {
                            webkitEnterFullscreen?: () => void;
                        }) | null;

                if(video)
                {
                    if(video.requestFullscreen)
                    {
                        await video.requestFullscreen();
                        return;
                    }

                    if(video.webkitEnterFullscreen)
                    {
                        video.webkitEnterFullscreen();
                        return;
                    }
                }
            }

            /*
             * Provider players are custom media elements /
             * iframes, so fullscreen the complete player screen.
             */
            if(screen.requestFullscreen)
            {
                await screen.requestFullscreen();
                return;
            }

            const legacyScreen = screen as HTMLDivElement & {
                webkitRequestFullscreen?: () => void;
            };

            if(legacyScreen.webkitRequestFullscreen)
            {
                legacyScreen.webkitRequestFullscreen();
            }
        }
        catch(e)
        {
            /*
             * Fullscreen can only be entered from a direct user
             * gesture. The Settings button provides that gesture.
             */
        }
    };

    const QuickVolumeButton = (
        {
            value,
            label
        }: {
            value: number;
            label: string;
        }
    ) => (
        <button
            type="button"
            onClick={ () =>
            {
                setVolume(value);
                setVolumePreset(value);
            } }
            className={
                `solace-video-player__volume-preset ${
                    volumePreset === value ? 'is-active' : ''
                }`
            }>
            { label }
        </button>
    );

    return (
        <OctaneCardView
            className={
                `youtube-player-modal solace-video-player ${
                    isFullscreen
                        ? 'solace-video-player--fullscreen'
                        : ''
                } ${ !isOpen ? 'solace-video-player--hidden' : '' }`
            }>

            <OctaneCardHeaderView
                headerText="Video Player"
                onCloseClick={ () => setIsOpen(false) }
            />

            <OctaneCardContentView
                className="solace-video-player__content">


                <div className="solace-video-player__player-tab">

                        <div
                            ref={ videoScreenRef }
                            className="solace-video-player__screen">
                            { currentMedia.valid
                                ? (
                                    <ReactPlayer
                                        ref={ ref =>
                                        {
                                            playerRef.current = ref;
                                        } }
                                        src={ currentMedia.src }
                                        width="100%"
                                        height={
                                            isFullscreen
                                                ? '100%'
                                                : 300
                                        }
                                        playing={ isLocallyPlaying }
                                        controls={ true }
                                        muted={ isMuted }
                                        loop={ isLooping }
                                        volume={
                                            Math.max(
                                                0,
                                                Math.min(
                                                    1,
                                                    volume / 100
                                                )
                                            )
                                        }
                                        config={ {
                                            youtube: {},
                                            vimeo: {}
                                        } }
                                        onReady={ () =>
                                        {
                                            setIsLocallyPlaying(true);

                                            const player =
                                                playerRef.current;

                                            if(player)
                                            {
                                                try
                                                {
                                                    const attempt =
                                                        player.play();

                                                    if(
                                                        attempt &&
                                                        typeof attempt.catch ===
                                                            'function'
                                                    )
                                                    {
                                                        attempt.catch(() =>
                                                        {
                                                            setIsMuted(true);

                                                            window.setTimeout(
                                                                () =>
                                                                {
                                                                    try
                                                                    {
                                                                        player
                                                                            .play()
                                                                            .catch(
                                                                                () =>
                                                                                    undefined
                                                                            );
                                                                    }
                                                                    catch(e)
                                                                    {
                                                                        // Browser requires interaction.
                                                                    }
                                                                },
                                                                0
                                                            );
                                                        });
                                                    }
                                                }
                                                catch(e)
                                                {
                                                    setIsMuted(true);

                                                    window.setTimeout(
                                                        () =>
                                                        {
                                                            try
                                                            {
                                                                player
                                                                    .play()
                                                                    .catch(
                                                                        () =>
                                                                            undefined
                                                                    );
                                                            }
                                                            catch(e)
                                                            {
                                                                // Browser requires interaction.
                                                            }
                                                        },
                                                        0
                                                    );
                                                }
                                            }

                                            addToHistory(
                                                activeMedia ||
                                                inputValue
                                            );
                                        } }
                                    />
                                )
                                : (
                                    <div className="solace-video-player__empty">
                                        <span className="solace-video-player__empty-icon">
                                            ▶
                                        </span>
                                        <strong>No video selected</strong>
                                        <small>
                                            Add a YouTube, Vimeo or direct video URL below.
                                        </small>
                                    </div>
                                )
                            }
                        </div>

                            {/* SOLACE_UI2_DIRECT_CONTROLS */}
                            { currentMedia.kind === 'direct' && (
                                <div className="solace-video-player__local-controls">
                                    <button
                                        type="button"
                                        onClick={ () =>
                                        {
                                            setIsLocallyPlaying(
                                                value => !value
                                            );
                                        } }
                                    >
                                        { isLocallyPlaying
                                            ? 'Pause'
                                            : 'Play'
                                        }
                                    </button>

                                    <button
                                        type="button"
                                        onClick={ () =>
                                        {
                                            setIsLocallyPlaying(false);

                                            if(playerRef.current)
                                            {
                                                playerRef.current.pause();
                                                playerRef.current.currentTime = 0;
                                            }
                                        } }
                                    >
                                        Stop
                                    </button>
                                </div>
                            ) }

                        <div className="solace-video-player__status">
                            <span>
                                { currentMedia.valid
                                    ? sourceLabel(
                                        currentMedia.kind
                                    )
                                    : 'Ready'
                                }
                            </span>

                            <span>
                                { broadcastVideo
                                    ? `Room playback${
                                        broadcastSender
                                            ? ` · ${ broadcastSender }`
                                            : ''
                                    }`
                                    : canManage
                                        ? 'Room control'
                                        : 'Viewing only'
                                }
                            </span>
                        </div>

                        <div className="solace-video-player__side-stack">

                            {/* SOLACE_UI2_SIDE_PLAYLIST */}
                            <div className="solace-video-player__side-card solace-video-player__playlist-side-card">
                                <div className="solace-video-player__side-title">
                                    <strong>Playlist</strong>
                                    <span>{ playlist.length }</span>
                                </div>

                                <div className="solace-video-player__side-playlist">
                                    { playlist.length === 0
                                        ? (
                                            <div className="solace-video-player__side-playlist-empty">
                                                Nothing queued yet
                                            </div>
                                        )
                                        : playlist.map((item, index) =>
                                        {
                                            const media =
                                                resolveMediaSource(item);

                                            return (
                                                <div
                                                    key={ `${ item }-${ index }` }
                                                    className="solace-video-player__side-playlist-item">

                                                    <button
                                                        type="button"
                                                        className="solace-video-player__side-playlist-main"
                                                        title={ item }
                                                        onClick={ () =>
                                                        {
                                                            if(canManage)
                                                            {
                                                                playMedia(item);
                                                            }
                                                        } }>

                                                        <span className="solace-video-player__side-playlist-number">
                                                            { index + 1 }
                                                        </span>

                                                        <span className="solace-video-player__side-playlist-copy">
                                                            <strong>
                                                                { friendlyVideoTitle(item) }
                                                            </strong>
                                                            <small>
                                                                { sourceLabel(media.kind) }
                                                            </small>
                                                        </span>
                                                    </button>

                                                    { canManage && (
                                                        <button
                                                            type="button"
                                                            className="solace-video-player__side-playlist-remove"
                                                            aria-label="Remove"
                                                            title="Remove"
                                                            onClick={ () =>
                                                                setPlaylist(
                                                                    previous =>
                                                                        previous.filter(
                                                                            (_, i) =>
                                                                                i !== index
                                                                        )
                                                                )
                                                            }>
                                                            ×
                                                        </button>
                                                    ) }
                                                </div>
                                            );
                                        })
                                    }
                                </div>

                                { canManage && playlist.length > 0 && (
                                    <button
                                        type="button"
                                        className="solace-video-player__side-playlist-clear"
                                        onClick={ () => setPlaylist([]) }>
                                        Clear playlist
                                    </button>
                                ) }
                            </div>

                            <div className="solace-video-player__side-card solace-video-player__settings-card">
                                <div className="solace-video-player__side-title">
                                    <strong>Player Settings</strong>
                                </div>

                                <label className="solace-video-player__inline-setting">
                                    <span>Volume</span>
                                    <strong>{ volume }%</strong>
                                </label>

                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={ volume }
                                    onChange={ event =>
                                    {
                                        const value =
                                            Number(event.target.value);

                                        setVolume(value);
                                        setVolumePreset(value);
                                        setIsMuted(value === 0);
                                    } }
                                />

                                <div className="solace-video-player__side-actions">
                                    <button
                                        type="button"
                                        onClick={ () =>
                                            setIsMuted(value => !value)
                                        }>
                                        { isMuted ? 'Unmute' : 'Mute' }
                                    </button>

                                    <button
                                        type="button"
                                        onClick={ () =>
                                            setIsLooping(value => !value)
                                        }
                                        className={
                                            isLooping ? 'is-active' : ''
                                        }>
                                        Loop
                                    </button>

                                    <button
                                        type="button"
                                        onClick={ toggleVideoFullscreen }>
                                        { isFullscreen
                                            ? 'Exit Fullscreen'
                                            : 'Fullscreen'
                                        }
                                    </button>
                                </div>

                                <small>
                                    Captions/subtitles are available through
                                    the video provider when that video
                                    supplies them.
                                </small>
                            </div>
                        </div>

                        { youtubeObjectId !== -1 &&
                            hasControl && (
                            <div className="solace-video-player__transport">
                                <button
                                    type="button"
                                    onClick={ handlePrev }>
                                    ◀◀
                                </button>

                                <button
                                    type="button"
                                    className="is-primary"
                                    onClick={
                                        isPlaying
                                            ? handlePause
                                            : handlePlay
                                    }>
                                    { isPlaying ? '⏸' : '▶' }
                                </button>

                                <button
                                    type="button"
                                    onClick={ handleNext }>
                                    ▶▶
                                </button>
                            </div>
                        )}

                        <div className="solace-video-player__url-row">
                            <input
                                type="text"
                                value={ inputValue }
                                onChange={ event =>
                                    setInputValue(
                                        event.target.value
                                    )
                                }
                                onKeyDown={ event =>
                                {
                                    if(event.key === 'Enter' &&
                                        canManage)
                                    {
                                        playMedia(inputValue);
                                    }
                                } }
                                disabled={ !canManage }
                                placeholder={
                                    canManage
                                        ? 'Paste YouTube, Vimeo, MP4, MOV or video URL...'
                                        : 'Room owner / rights users control playback'
                                }
                            />

                            { canManage && (
                                <button
                                    type="button"
                                    className="solace-video-player__play-button"
                                    disabled={
                                        !resolveMediaSource(
                                            inputValue
                                        ).valid
                                    }
                                    onClick={ () =>
                                        playMedia(inputValue)
                                    }>
                                    Play
                                </button>
                            )}
                        </div>

                        { canManage && currentMedia.valid && (
                            <div className="solace-video-player__manage-row">
                                <button
                                    type="button"
                                    onClick={ addToPlaylist }>
                                    + Add to playlist
                                </button>

                                { broadcastVideo && (
                                    <button
                                        type="button"
                                        className="is-danger"
                                        onClick={ stopRoomVideo }>
                                        Stop room video
                                    </button>
                                )}
                            </div>
                        )}

                        <div className="solace-video-player__side-card solace-video-player__watchers-card">
                            <div className="solace-video-player__side-title">
                                <strong>Who's Watching</strong>
                                <span>{ watcherIds.size }</span>
                            </div>

                            <div className="solace-video-player__watchers solace-video-player__watchers--under">
                                { watcherIds.size === 0 && (
                                    <div className="solace-video-player__list-empty">
                                        Nobody is watching yet
                                    </div>
                                ) }

                                { Array.from(watcherIds).map(userId =>
                                {
                                    const session = GetRoomSession();
                                    const user =
                                        session?.userDataManager
                                            .getUserData(userId);

                                    if(!user?.name) return null;

                                    return (
                                        <div
                                            key={ userId }
                                            className="solace-video-player__watcher">

                                            <LayoutAvatarImageView
                                                figure={ user.figure }
                                                headOnly
                                                direction={ 2 }
                                                scale={ 1 }
                                            />

                                            <span className="solace-video-player__watcher-name">
                                                { user.name }
                                            </span>

                                            <span className="solace-video-player__watching-dot" />
                                        </div>
                                    );
                                }) }
                            </div>
                        </div>
                    </div>

                { tab === 'history' && (
                    <div className="solace-video-player__panel">
                        <div className="solace-video-player__panel-heading">
                            <strong>Watch history</strong>

                            { history.length > 0 && (
                                <button
                                    type="button"
                                    onClick={ () =>
                                        setHistory([])
                                    }>
                                    Clear
                                </button>
                            )}
                        </div>

                        <div className="solace-video-player__list">
                            { history.length === 0
                                ? (
                                    <div className="solace-video-player__list-empty">
                                        No videos watched yet
                                    </div>
                                )
                                : history.map((item, index) =>
                                {
                                    const media =
                                        resolveMediaSource(item);

                                    return (
                                        <button
                                            type="button"
                                            key={
                                                `${ item }-${ index }`
                                            }
                                            className="solace-video-player__history-item"
                                            onClick={ () =>
                                            {
                                                if(canManage)
                                                {
                                                    playMedia(item);
                                                }
                                            } }>
                                            <strong>
                                                { sourceLabel(
                                                    media.kind
                                                ) }
                                            </strong>
                                            <span>{ item }</span>
                                        </button>
                                    );
                                })
                            }
                        </div>
                    </div>
                )}

                { tab === 'spectators' && (
                    <div className="solace-video-player__panel">
                        <div className="solace-video-player__panel-heading">
                            <strong>
                                Watching ({ watcherIds.size })
                            </strong>
                        </div>

                        <div className="solace-video-player__watchers">
                            { watcherIds.size === 0 && (
                                <div className="solace-video-player__list-empty">
                                    Nobody is watching yet
                                </div>
                            )}

                            { Array.from(watcherIds).map(userId =>
                            {
                                const session =
                                    GetRoomSession();

                                const user =
                                    session?.userDataManager
                                        .getUserData(userId);

                                if(!user?.name) return null;

                                return (
                                    <div
                                        key={ userId }
                                        className="solace-video-player__watcher">

                                        <LayoutAvatarImageView
                                            figure={ user.figure }
                                            headOnly
                                            direction={ 2 }
                                            scale={ 1 }
                                        />

                                        <span>{ user.name }</span>

                                        <span className="solace-video-player__watching-dot" />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                { tab === 'settings' && (
                    <div className="solace-video-player__settings">

                        <div className="solace-video-player__setting-card">
                            <div className="solace-video-player__setting-title">
                                <strong>Volume</strong>
                                <span>{ volume }%</span>
                            </div>

                            <button
                                type="button"
                                className="solace-video-player__setting-toggle"
                                onClick={ () =>
                                    setShowVolumeSlider(
                                        value => !value
                                    )
                                }>
                                { showVolumeSlider
                                    ? 'Hide slider'
                                    : 'Show slider'
                                }
                            </button>

                            { showVolumeSlider && (
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={ volume }
                                    onChange={ event =>
                                    {
                                        const value =
                                            parseInt(
                                                event.target.value
                                            );

                                        setVolume(value);
                                        setVolumePreset(value);
                                    } }
                                />
                            )}

                            <div className="solace-video-player__volume-presets">
                                <QuickVolumeButton
                                    value={ 0 }
                                    label="Mute"
                                />
                                <QuickVolumeButton
                                    value={ 25 }
                                    label="25%"
                                />
                                <QuickVolumeButton
                                    value={ 50 }
                                    label="50%"
                                />
                                <QuickVolumeButton
                                    value={ 75 }
                                    label="75%"
                                />
                                <QuickVolumeButton
                                    value={ 100 }
                                    label="100%"
                                />
                            </div>
                        </div>

                        <div className="solace-video-player__setting-card">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={ isMuted }
                                    onChange={ event =>
                                        setIsMuted(
                                            event.target.checked
                                        )
                                    }
                                />
                                Mute
                            </label>

                            <label>
                                <input
                                    type="checkbox"
                                    checked={ isLooping }
                                    onChange={ event =>
                                        setIsLooping(
                                            event.target.checked
                                        )
                                    }
                                />
                                Loop
                            </label>

                            <label>
                                <input
                                    type="checkbox"
                                    checked={ isFullscreen }
                                    onChange={ event =>
                                        setIsFullscreen(
                                            event.target.checked
                                        )
                                    }
                                />
                                Fullscreen
                            </label>
                        </div>

                        <div className="solace-video-player__info-card">
                            <div>
                                <span>Room playback</span>
                                <strong>
                                    { broadcastVideo
                                        ? 'Active'
                                        : 'Ready'
                                    }
                                </strong>
                            </div>

                            <div>
                                <span>Control</span>
                                <strong>
                                    { canManage
                                        ? 'Owner / rights'
                                        : 'Viewing only'
                                    }
                                </strong>
                            </div>

                            <div>
                                <span>Watching</span>
                                <strong>
                                    { watcherIds.size }
                                </strong>
                            </div>
                        </div>
                    </div>
                )}

            </OctaneCardContentView>
        </OctaneCardView>
    );
};
