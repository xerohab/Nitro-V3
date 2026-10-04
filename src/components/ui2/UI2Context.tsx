import { createContext, FC, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

export type UI2ToolbarTabId = 'main' | 'tools' | 'me';

interface IUI2Context
{
    enabled: boolean;
    setEnabled: (enabled: boolean) => void;

    colour: string;
    setColour: (colour: string) => void;

    theme: string;
    setTheme: (theme: string) => void;

    purseVisible: boolean;
    setPurseVisible: (visible: boolean) => void;

    activeToolbarTab: UI2ToolbarTabId;
    setActiveToolbarTab: (tab: UI2ToolbarTabId) => void;

    serverPanelOpen: boolean;
    setServerPanelOpen: (open: boolean) => void;

    actionPanelOpen: boolean;
    setActionPanelOpen: (open: boolean) => void;
}

const UI2Context = createContext<IUI2Context>({
    enabled: false,
    setEnabled: () => {},

    colour: '#3b82f6',
    setColour: () => {},

    theme: 'solid',
    setTheme: () => {},

    purseVisible: true,
    setPurseVisible: () => {},

    activeToolbarTab: 'main',
    setActiveToolbarTab: () => {},

    serverPanelOpen: false,
    setServerPanelOpen: () => {},

    actionPanelOpen: false,
    setActionPanelOpen: () => {}
});

const STORAGE = {
    enabled: 'solace.ui2.enabled',
    colour: 'solace.ui2.colour',
    theme: 'solace.ui2.theme',
    purseVisible: 'solace.ui2.purse.visible'
};

const readStorage = (key: string, fallback: string): string =>
{
    try
    {
        return localStorage.getItem(key) ?? fallback;
    }
    catch
    {
        return fallback;
    }
};

const getInitialEnabled = (): boolean => true;

const getInitialColour = (): string =>
    readStorage(STORAGE.colour, '#3b82f6');

const getInitialTheme = (): string =>
    readStorage(STORAGE.theme, 'solid');

const getInitialPurseVisible = (): boolean =>
    readStorage(STORAGE.purseVisible, 'true') !== 'false';

export const UI2Provider: FC<PropsWithChildren> = ({ children }) =>
{
    const [enabled, setEnabledState] = useState(getInitialEnabled);
    const [colour, setColourState] = useState(getInitialColour);
    const [theme, setThemeState] = useState(getInitialTheme);
    const [purseVisible, setPurseVisibleState] = useState(getInitialPurseVisible);

    const [activeToolbarTab, setActiveToolbarTab] =
        useState<UI2ToolbarTabId>('main');

    const [serverPanelOpen, setServerPanelOpen] = useState(false);
    const [actionPanelOpen, setActionPanelOpen] = useState(false);

    useEffect(() =>
    {
        const root = document.documentElement;

        if(enabled)
        {
            root.classList.add('solace-ui2-enabled');
        }
        else
        {
            root.classList.remove('solace-ui2-enabled');
        }

        return () => root.classList.remove('solace-ui2-enabled');
    }, [ enabled ]);

    /*
     * UI2 theme colour is shared with all UI2-aware windows.
     * This deliberately lives on <html> so Catalogue/Inventory,
     * which are rendered outside the UI2 overlay tree, can inherit
     * the same selected toolbar colour.
     */
    useEffect(() =>
    {
        const root = document.documentElement;

        root.style.setProperty('--solace-ui2-colour', colour);
        root.dataset.solaceUi2Theme = theme;

        return () =>
        {
            root.style.removeProperty('--solace-ui2-colour');
            delete root.dataset.solaceUi2Theme;
        };
    }, [ colour, theme ]);

    const setEnabled = (_value: boolean) =>
    {
        /*
         * Project XeroX UI is now the permanent desktop interface.
         * Keep this function for compatibility with existing consumers,
         * but do not allow legacy saved preferences to disable UI2.
         */
        try
        {
            localStorage.setItem(STORAGE.enabled, 'true');
        }
        catch {}

        setEnabledState(true);
    };

    const setColour = (value: string) =>
    {
        try
        {
            localStorage.setItem(STORAGE.colour, value);
        }
        catch {}

        setColourState(value);
    };

    const setTheme = (value: string) =>
    {
        try
        {
            localStorage.setItem(STORAGE.theme, value);
        }
        catch {}

        setThemeState(value);
    };

    const setPurseVisible = (value: boolean) =>
    {
        try
        {
            localStorage.setItem(STORAGE.purseVisible, String(value));
        }
        catch {}

        setPurseVisibleState(value);
    };

    const value = useMemo(() => ({
        enabled,
        setEnabled,
        colour,
        setColour,
        theme,
        setTheme,
        purseVisible,
        setPurseVisible,
        activeToolbarTab,
        setActiveToolbarTab,
        serverPanelOpen,
        setServerPanelOpen,
        actionPanelOpen,
        setActionPanelOpen
    }), [
        enabled,
        colour,
        theme,
        purseVisible,
        activeToolbarTab,
        serverPanelOpen,
        actionPanelOpen
    ]);

    return (
        <UI2Context value={value}>
            {children}
        </UI2Context>
    );
};

export const useUI2 = () => useContext(UI2Context);
