import { ComponentType, LazyExoticComponent, lazy } from 'react';
import HtmlPlayer from 'react-player/HtmlPlayer';
import { canPlay } from 'react-player/patterns';
import { PlayerEntry } from 'react-player/players';
import { createReactPlayer } from 'react-player/ReactPlayer';
import { VideoElementProps } from 'react-player/types';

const YoutubeElement = lazy(() => import('youtube-video-element/react')) as LazyExoticComponent<ComponentType<VideoElementProps>>;
const VimeoElement = lazy(() => import('vimeo-video-element/react')) as LazyExoticComponent<ComponentType<VideoElementProps>>;

/*
 * Solace Video Player
 *
 * Keep this filename/export for compatibility with the existing Nitro
 * implementation, but the player itself is no longer YouTube-only.
 *
 * Supported:
 *   - YouTube
 *   - Vimeo
 *   - HTML5/browser-playable video URLs (.mp4, .mov, .webm, etc.)
 */
const YoutubeReactPlayer = createReactPlayer(
    [
        {
            key: 'youtube',
            name: 'YouTube',
            canPlay: canPlay.youtube,
            player: YoutubeElement
        },
        {
            key: 'vimeo',
            name: 'Vimeo',
            canPlay: canPlay.vimeo,
            player: VimeoElement
        }
    ] satisfies PlayerEntry[],
    {
        key: 'html',
        name: 'html',
        canPlay: canPlay.html,
        canEnablePIP: () => true,
        player: HtmlPlayer
    }
);

export default YoutubeReactPlayer;
