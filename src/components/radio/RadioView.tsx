import { FC, useEffect, useState } from 'react';
import {
    FaBroadcastTower,
    FaChevronDown,
    FaChevronUp,
    FaMinus,
    FaPlay,
    FaStop,
    FaTimes,
    FaVolumeUp
} from 'react-icons/fa';
import { LocalizeText, localizeWithFallback } from '../../api';
import {
    DraggableWindow,
    DraggableWindowPosition,
    LayoutImage
} from '../../common';
import { RadioStation, useRadio } from '../../hooks';
import { useUI2 } from '../ui2/UI2Context';

const RADIO_TOGGLE_EVENT = 'solace:radio-toggle';
const RADIO_VISIBILITY_EVENT = 'solace:radio-visibility';

export const RadioView: FC<{}> = () =>
{
    const { theme } = useUI2();

    const {
        stations,
        currentId,
        isPlaying,
        volume,
        loadError,
        play,
        stop,
        setVolume
    } = useRadio();

    const isUI2 =
        document.documentElement.classList.contains('solace-ui2-enabled');

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

    const seasonalIcon =
        isUI2
            ? (seasonalThemeIcon[theme] ?? null)
            : null;

    const [classicOpen, setClassicOpen] = useState(false);
    const [classicCollapsed, setClassicCollapsed] = useState(false);
    const [classicHidden, setClassicHidden] = useState(false);

    const [ui2PickerOpen, setUI2PickerOpen] = useState(false);
    const [ui2Visible, setUI2Visible] = useState(true);

    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() =>
    {
        if(!selectedId && stations.length)
            setSelectedId(stations[0].id);
    }, [stations, selectedId]);

    useEffect(() =>
    {
        if(!isUI2) return;

        const onToggle = () =>
        {
            setUI2Visible(value =>
            {
                const next = !value;

                if(!next) setUI2PickerOpen(false);

                return next;
            });
        };

        window.addEventListener(RADIO_TOGGLE_EVENT, onToggle);

        return () =>
            window.removeEventListener(RADIO_TOGGLE_EVENT, onToggle);
    }, [isUI2]);

    useEffect(() =>
    {
        if(!isUI2) return;

        window.dispatchEvent(
            new CustomEvent(RADIO_VISIBILITY_EVENT, {
                detail: { visible: ui2Visible }
            })
        );
    }, [isUI2, ui2Visible]);

    const selected: RadioStation | null =
        stations.find(station => station.id === selectedId) ??
        stations[0] ??
        null;

    const selectedPlaying =
        !!selected &&
        currentId === selected.id &&
        isPlaying;

    const onPlayToggle = () =>
    {
        if(!selected) return;

        if(selectedPlaying) stop();
        else play(selected);
    };

    const onClassicPick = (station: RadioStation) =>
    {
        setSelectedId(station.id);
        setClassicOpen(false);
        play(station);
    };

    const onUI2Pick = (station: RadioStation) =>
    {
        setSelectedId(station.id);
        setUI2PickerOpen(false);
        play(station);
    };


    /* ========================================================
       CLASSIC RADIO
       ======================================================== */

    if(!isUI2)
    {
        if(classicHidden) return null;

        const toggleCollapsed = () =>
        {
            setClassicCollapsed(value =>
            {
                if(!value) setClassicOpen(false);

                return !value;
            });
        };

        const onClose = () =>
        {
            stop();
            setClassicHidden(true);
        };

        return (
            <DraggableWindow
                uniqueKey="octane-radio"
                windowPosition={ DraggableWindowPosition.TOP_LEFT }>
                <div className="radio-widget radio-widget--classic w-[244px] max-w-[64vw] select-none overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-[rgba(22,24,30,0.94)] to-[rgba(10,11,14,0.94)] text-white shadow-[0_8px_24px_rgba(0,0,0,0.4)] backdrop-blur-sm">

                    <div className="drag-handler flex cursor-move items-center gap-2 border-b border-white/10 px-3 py-1.5">

                        <FaBroadcastTower
                            className={
                                `text-[11px] ${
                                    isPlaying
                                        ? 'text-sky-400'
                                        : 'text-white/45'
                                }`
                            }
                        />

                        <span className="grow text-[10px] font-bold uppercase tracking-[0.14em] text-white/55">
                            { LocalizeText('radio.title') }
                        </span>

                        <div className={ `radio-eq ${isPlaying ? 'is-live' : ''}` }>
                            <span />
                            <span />
                            <span />
                            <span />
                        </div>

                        <button
                            type="button"
                            onClick={ toggleCollapsed }
                            title={
                                classicCollapsed
                                    ? LocalizeText('radio.show')
                                    : LocalizeText('radio.hide')
                            }
                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/8 text-white/60 transition-colors hover:bg-white/15 hover:text-white">
                            {
                                classicCollapsed
                                    ? <FaChevronDown className="text-[9px]" />
                                    : <FaChevronUp className="text-[9px]" />
                            }
                        </button>

                        <button
                            type="button"
                            onClick={ onClose }
                            title={ localizeWithFallback('radio.close', 'Close') }
                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/8 text-white/60 transition-colors hover:bg-white/15 hover:text-white">
                            <FaTimes className="text-[9px]" />
                        </button>
                    </div>

                    { !classicCollapsed &&
                        <>
                            <div className="flex items-center gap-2.5 px-3 py-2.5">

                                <button
                                    type="button"
                                    onClick={ onPlayToggle }
                                    disabled={ !selected }
                                    title={
                                        selectedPlaying
                                            ? LocalizeText('radio.stop')
                                            : LocalizeText('radio.title')
                                    }
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs text-white shadow-inner transition-all hover:bg-emerald-400 disabled:opacity-40">
                                    {
                                        selectedPlaying
                                            ? <FaStop />
                                            : <FaPlay className="translate-x-px" />
                                    }
                                </button>

                                <div className="min-w-0 grow">
                                    <div className="truncate text-sm font-bold leading-tight">
                                        {
                                            selected
                                                ? selected.name
                                                : LocalizeText('radio.title')
                                        }
                                    </div>

                                    <div className="mt-0.5 flex items-center gap-1.5">
                                        { selectedPlaying &&
                                            <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-sky-400">
                                                <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                                                { LocalizeText('radio.live') }
                                            </span> }

                                        { selected?.genre &&
                                            <span className="truncate text-[10px] text-white/45">
                                                { selected.genre }
                                            </span> }
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={ () =>
                                        setClassicOpen(value => !value)
                                    }
                                    title={ LocalizeText('radio.title') }
                                    className={
                                        `flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                                            classicOpen
                                                ? 'bg-white/20'
                                                : 'bg-white/8 hover:bg-white/15'
                                        }`
                                    }>
                                    <FaChevronDown
                                        className={
                                            `text-[10px] transition-transform ${
                                                classicOpen
                                                    ? 'rotate-180'
                                                    : ''
                                            }`
                                        }
                                    />
                                </button>
                            </div>

                            { selectedPlaying &&
                                <div className="flex items-center gap-2 px-3 pb-2.5">
                                    <span className="text-xs text-white/55">
                                        🔊
                                    </span>

                                    <input
                                        type="range"
                                        min={ 0 }
                                        max={ 1 }
                                        step={ 0.01 }
                                        value={ volume }
                                        onChange={ event =>
                                            setVolume(event.target.valueAsNumber)
                                        }
                                        className="radio-vol h-1 grow cursor-pointer"
                                    />
                                </div> }

                            { classicOpen &&
                                <div className="border-t border-white/10 bg-black/20 p-1.5">

                                    { loadError &&
                                        <div className="px-2 py-2 text-[11px] text-red-400">
                                            { LocalizeText('radio.error') }
                                        </div> }

                                    { !loadError && !stations.length &&
                                        <div className="px-2 py-2 text-[11px] text-white/50">
                                            { LocalizeText('radio.empty') }
                                        </div> }

                                    <div className="radio-scroll flex max-h-[156px] flex-col gap-1 overflow-y-auto pr-0.5">

                                        { stations.map(station =>
                                        {
                                            const active =
                                                station.id === selectedId;

                                            const playing =
                                                currentId === station.id &&
                                                isPlaying;

                                            return (
                                                <div
                                                    key={ station.id }
                                                    onClick={ () =>
                                                        onClassicPick(station)
                                                    }
                                                    className={
                                                        `flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors ${
                                                            active
                                                                ? 'bg-sky-500/15 ring-1 ring-sky-400/40'
                                                                : 'hover:bg-white/8'
                                                        }`
                                                    }>

                                                    { station.logo
                                                        ? <LayoutImage
                                                            imageUrl={ station.logo }
                                                            className="h-7 w-7 shrink-0 rounded bg-contain bg-center bg-no-repeat"
                                                        />
                                                        : <div
                                                            className={
                                                                `flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] ${
                                                                    playing
                                                                        ? 'bg-sky-500/80'
                                                                        : 'bg-white/10'
                                                                }`
                                                            }>
                                                            {
                                                                playing
                                                                    ? <FaStop />
                                                                    : <FaPlay className="translate-x-px" />
                                                            }
                                                        </div>
                                                    }

                                                    <div className="min-w-0 grow">
                                                        <div className="truncate text-xs font-bold leading-tight">
                                                            { station.name }
                                                        </div>

                                                        { station.genre &&
                                                            <div className="truncate text-[10px] text-white/45">
                                                                { station.genre }
                                                            </div> }
                                                    </div>

                                                    { playing &&
                                                        <div className="radio-eq is-live shrink-0">
                                                            <span />
                                                            <span />
                                                            <span />
                                                            <span />
                                                        </div> }
                                                </div>
                                            );
                                        }) }
                                    </div>
                                </div> }
                        </>
                    }
                </div>
            </DraggableWindow>
        );
    }


    /* ========================================================
       UI2 RADIO
       ======================================================== */

    if(!ui2Visible) return null;

    const minimiseUI2 = () =>
    {
        setUI2PickerOpen(false);
        setUI2Visible(false);
    };

    const closeUI2 = () =>
    {
        setUI2PickerOpen(false);
        stop();
        setUI2Visible(false);
    };

    return (
        <DraggableWindow
            uniqueKey="octane-radio-ui2"
            windowPosition={ DraggableWindowPosition.TOP_LEFT }>

            <div className="radio-widget solace-ui2-radio">

                <div className="radio-widget__header drag-handler">

                    <FaBroadcastTower className="radio-widget__title-icon" />

                    { seasonalIcon &&
                        <span
                            className="radio-widget__seasonal-header-icon"
                            aria-hidden="true">
                            { seasonalIcon }
                        </span> }

                    <span className="radio-widget__title">
                        { LocalizeText('radio.title') }
                    </span>

                    <button
                        type="button"
                        onClick={ minimiseUI2 }
                        title="Minimise"
                        className="radio-widget__window-button">
                        <FaMinus />
                    </button>

                    <button
                        type="button"
                        onClick={ closeUI2 }
                        title={ localizeWithFallback('radio.close', 'Close') }
                        className="radio-widget__window-button radio-widget__window-button--close">
                        <FaTimes />
                    </button>
                </div>

                <div className="radio-widget__body">

                    { seasonalIcon &&
                        <span
                            className="radio-widget__seasonal-watermark"
                            aria-hidden="true">
                            { seasonalIcon }
                        </span> }

                    <div className="radio-widget__station">

                        <button
                            type="button"
                            onClick={ onPlayToggle }
                            disabled={ !selected }
                            className="radio-widget__play">
                            {
                                selectedPlaying
                                    ? <FaStop />
                                    : <FaPlay />
                            }
                        </button>

                        <div className="radio-widget__station-copy">
                            <div className="radio-widget__station-name">
                                {
                                    selected
                                        ? selected.name
                                        : LocalizeText('radio.title')
                                }
                            </div>

                            <div className="radio-widget__station-meta">
                                { selectedPlaying &&
                                    <span className="radio-widget__live">
                                        <span className="radio-widget__live-dot" />
                                        { LocalizeText('radio.live') }
                                    </span> }

                                { selected?.genre &&
                                    <span className="radio-widget__genre">
                                        { selected.genre }
                                    </span> }
                            </div>
                        </div>

                        <div className={ `radio-eq ${selectedPlaying ? 'is-live' : ''}` }>
                            <span />
                            <span />
                            <span />
                            <span />
                        </div>
                    </div>

                    <div className="radio-widget__volume">
                        <FaVolumeUp />

                        <input
                            type="range"
                            min={ 0 }
                            max={ 1 }
                            step={ 0.01 }
                            value={ volume }
                            onChange={ event =>
                                setVolume(event.target.valueAsNumber)
                            }
                            className="radio-vol"
                        />
                    </div>

                    <div className="radio-widget__picker-wrap">

                        <button
                            type="button"
                            onClick={ () =>
                                setUI2PickerOpen(value => !value)
                            }
                            className={
                                `radio-widget__picker-button ${
                                    ui2PickerOpen ? 'is-open' : ''
                                }`
                            }>
                            <span>Choose Station</span>
                            <FaChevronDown />
                        </button>

                        { ui2PickerOpen &&
                            <div className="radio-widget__picker">

                                { loadError &&
                                    <div className="radio-widget__message radio-widget__message--error">
                                        { LocalizeText('radio.error') }
                                    </div> }

                                { !loadError && !stations.length &&
                                    <div className="radio-widget__message">
                                        { LocalizeText('radio.empty') }
                                    </div> }

                                { stations.map(station =>
                                {
                                    const active =
                                        station.id === selected?.id;

                                    return (
                                        <button
                                            type="button"
                                            key={ station.id }
                                            onClick={ () =>
                                                onUI2Pick(station)
                                            }
                                            className={
                                                `radio-widget__station-option ${
                                                    active ? 'is-active' : ''
                                                }`
                                            }>

                                            <span className="radio-widget__option-copy">
                                                <strong>{ station.name }</strong>

                                                { station.genre &&
                                                    <small>
                                                        { station.genre }
                                                    </small> }
                                            </span>
                                        </button>
                                    );
                                }) }
                            </div> }
                    </div>
                </div>
            </div>
        </DraggableWindow>
    );
};
