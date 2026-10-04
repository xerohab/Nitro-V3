import { FC, useEffect, useRef, useState } from 'react';
import { FaBroadcastTower } from 'react-icons/fa';
import {
    CreateLinkEvent,
    OpenMessengerChat,
    SendMessageComposer
} from '../../../api';
import { FindNewFriendsMessageComposer } from '@octane/renderer';
import { useBuildHeight } from '../../../hooks';
import { useUI2 } from '../UI2Context';
import { UI2Settings } from '../settings';
import { UI2ToolbarButton } from './UI2ToolbarButton';

export const UI2Toolbar: FC = () =>
{
    const { colour, theme } = useUI2();

    const [appearanceOpen, setAppearanceOpen] = useState(false);
    const [toolsOpen, setToolsOpen] = useState(false);
    const [radioVisible, setRadioVisible] = useState(true);

    const toolsRef = useRef<HTMLDivElement>(null);

    const { toggle: toggleBuildHeight } = useBuildHeight();

    const action = (event: string) => CreateLinkEvent(event);

    const closeTools = () => setToolsOpen(false);

    const runTool = (callback: () => void) =>
    {
        closeTools();
        callback();
    };

    const openVideoPlayer = () =>
        window.dispatchEvent(new CustomEvent('youtube:toggle'));

    const openFindFriends = () =>
        SendMessageComposer(new FindNewFriendsMessageComposer());

    const toggleRadio = () =>
        window.dispatchEvent(new CustomEvent('solace:radio-toggle'));

    useEffect(() =>
    {
        const onRadioVisibility = (event: Event) =>
        {
            const customEvent =
                event as CustomEvent<{ visible?: boolean }>;

            setRadioVisible(!!customEvent.detail?.visible);
        };

        window.addEventListener(
            'solace:radio-visibility',
            onRadioVisibility
        );

        return () =>
            window.removeEventListener(
                'solace:radio-visibility',
                onRadioVisibility
            );
    }, []);

    useEffect(() =>
    {
        if(!toolsOpen) return;

        const onPointerDown = (event: PointerEvent) =>
        {
            if(
                toolsRef.current &&
                !toolsRef.current.contains(event.target as Node)
            )
            {
                setToolsOpen(false);
            }
        };

        document.addEventListener('pointerdown', onPointerDown);

        return () =>
            document.removeEventListener('pointerdown', onPointerDown);
    }, [toolsOpen]);

    const seasonalThemeIcon: Record<string, string> = {
        halloween: '🎃',
        christmas: '☃️',
        valentines: '❤️',
        easter: '🐰',
        summer: '☀️',
        winter: '❄️',
        autumn: '🍂',
        stpatricks: '☘️',
        newyear: '🎆',
        bonfire: '🎇',
        oktoberfest: '🍺',
        spring: '🌷'
    };

    const seasonalIcon = seasonalThemeIcon[theme] ?? null;

    return (
        <div
            className="solace-ui2-toolbar"
            style={
                {
                    '--solace-ui2-colour': colour
                } as React.CSSProperties
            }>

            <div className="solace-ui2-toolbar-content">

                <UI2ToolbarButton
                    icon="house"
                    label="Home"
                    onClick={ () => action('navigator/goto/home') }
                />

                <UI2ToolbarButton
                    icon="rooms"
                    label="Rooms"
                    onClick={ () => action('navigator/toggle') }
                />

                <UI2ToolbarButton
                    icon="catalog"
                    label="Catalogue"
                    onClick={ () => action('catalog/toggle/normal') }
                />

                <UI2ToolbarButton
                    icon="inventory"
                    label="Inventory"
                    onClick={ () => action('inventory/toggle') }
                />

                <UI2ToolbarButton
                    icon="progression"
                    label="Achievements"
                    onClick={ () => action('achievements/toggle') }
                />

                <UI2ToolbarButton
                    icon="game"
                    label="Games"
                    onClick={ () => action('games/toggle') }
                />

                <UI2ToolbarButton
                    icon="camera"
                    label="Camera"
                    onClick={ () => action('camera/toggle') }
                />

                <UI2ToolbarButton
                    icon="fortune-wheel"
                    label="Fortune Wheel"
                    onClick={ () => action('fortune-wheel/toggle') }
                />

                <UI2ToolbarButton
                    icon="video-player"
                    label="Video Player"
                    onClick={ openVideoPlayer }
                />

                <UI2ToolbarButton
                    icon="mentions"
                    label="Mentions"
                    onClick={ () => action('mentions/toggle') }
                />

                <UI2ToolbarButton
                    icon="me-clothing"
                    label="My Wardrobe"
                    onClick={ () => action('avatar-editor/toggle') }
                />




                <button
                    type="button"
                    onClick={ toggleRadio }
                    aria-label={
                        radioVisible
                            ? 'Minimise Radio'
                            : 'Open Radio'
                    }
                    title={
                        radioVisible
                            ? 'Minimise Radio'
                            : 'Open Radio'
                    }
                    className={
                        `solace-ui2-radio-toolbar-button ${
                            radioVisible ? 'is-active' : ''
                        }`
                    }>
                    <FaBroadcastTower />
                </button>

                <UI2ToolbarButton
                    icon="friendsearch"
                    label="Find Friends"
                    onClick={ openFindFriends }
                />

                <UI2ToolbarButton
                    icon="message"
                    label="Messenger"
                    onClick={ () => OpenMessengerChat() }
                />

                { seasonalIcon &&
                    <div
                        className="solace-ui2-seasonal-toolbar-emblem"
                        aria-hidden="true"
                        title={
                            `${theme.charAt(0).toUpperCase()}${theme.slice(1)} theme`
                        }>
                        <span>{ seasonalIcon }</span>
                    </div> }

                <div
                    id="toolbar-friend-bar-container-desktop-ui2"
                    className="solace-ui2-friend-bar-target"
                />

                <div
                    ref={ toolsRef }
                    className="solace-ui2-settings-tool-wrap">

                    <UI2ToolbarButton
                        icon="cog"
                        label="Settings & Tools"
                        active={ toolsOpen }
                        onClick={ () =>
                            setToolsOpen(value => !value)
                        }
                    />

                    { toolsOpen &&
                        <div className="solace-ui2-settings-tool-tray">

                            <UI2ToolbarButton
                                icon="housekeeping"
                                label="Housekeeping"
                                onClick={ () =>
                                    runTool(() =>
                                        action('housekeeping/toggle')
                                    )
                                }
                            />

                            <UI2ToolbarButton
                                icon="help"
                                label="Call For Help"
                                onClick={ () =>
                                    runTool(() =>
                                        action('help/show')
                                    )
                                }
                            />

                            <UI2ToolbarButton
                                icon="modtools"
                                label="Mod Tools"
                                onClick={ () =>
                                    runTool(() =>
                                        action('mod-tools/toggle')
                                    )
                                }
                            />

                            <UI2ToolbarButton
                                icon="buildheight"
                                label="Build Height"
                                onClick={ () =>
                                    runTool(toggleBuildHeight)
                                }
                            />

                            <UI2ToolbarButton
                                icon="cog"
                                label="UI Settings"
                                onClick={ () =>
                                {
                                    closeTools();
                                    setAppearanceOpen(true);
                                } }
                            />

                            <UI2ToolbarButton
                                icon="me-settings"
                                label="Game Settings"
                                onClick={ () =>
                                    runTool(() =>
                                        action('user-settings/toggle')
                                    )
                                }
                            />
                        </div> }
                </div>
            </div>

            <UI2Settings
                open={ appearanceOpen }
                onClose={ () => setAppearanceOpen(false) }
            />
        </div>
    );
};
