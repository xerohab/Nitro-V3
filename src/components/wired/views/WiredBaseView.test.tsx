/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    wired: {
        trigger: { id: 77, spriteId: 1, intData: [1], stringData: '', selectedItems: [] as number[] },
        setTrigger: vi.fn(),
        setIntParams: vi.fn(),
        setStringParam: vi.fn(),
        setFurniIds: vi.fn(),
        furniIds: [] as number[],
        setAllowsFurni: vi.fn(),
        saveWired: vi.fn(),
        saveWiredAndKeepOpen: vi.fn(),
        clipboardEntry: null as unknown,
        copyWiredToClipboard: vi.fn(),
        pasteWiredFromClipboard: vi.fn(),
        resetWiredToDefault: vi.fn(),
        clearWiredPicks: vi.fn()
    },
    roomSettings: { canModify: true }
}));

vi.mock('@octane/renderer', () => ({
    GetRoomEngine: () => ({ areaSelectionManager: { clearHighlight: vi.fn(), deactivate: vi.fn() } }),
    GetSessionDataManager: () => ({ getFloorItemData: () => ({ name: 'WIRED Action' }) })
}));

vi.mock('../../../api', () => ({
    LocalizeText: (key: string) => key,
    localizeWithFallback: (key: string, fallback: string) => fallback,
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0 },
    WiredSelectionVisualizer: { clearAllSelectionShaders: vi.fn(), clearSelectionShaderFromFurni: vi.fn(), applySelectionShaderToFurni: vi.fn() },
    wiredStyleClassName: () => ''
}));

vi.mock('../../../assets/images/wired/wired_bg_left.png', () => ({ default: 'left.png' }));
vi.mock('../../../assets/images/wired/wired_bg_right.png', () => ({ default: 'right.png' }));

vi.mock('../../../common', () => ({
    Button: ({ children, fullWidth: _fullWidth, classNames: _classNames, ...props }: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement> & { fullWidth?: boolean; classNames?: string[] }>) => (
        <button type="button" {...props}>
            {children}
        </button>
    ),
    OctaneCardView: ({ children }: PropsWithChildren) => <div>{children}</div>,
    OctaneCardHeaderView: ({ headerText, children }: PropsWithChildren<{ headerText: string }>) => (
        <div>
            {headerText}
            {children}
        </div>
    ),
    OctaneCardContentView: ({ children }: PropsWithChildren) => <div>{children}</div>,
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
}));

vi.mock('../../../hooks', () => ({
    useWired: () => mocks.wired,
    useWiredTools: () => ({ roomSettings: mocks.roomSettings, accountPreferences: { wiredStyle: 'default' } })
}));

vi.mock('./WiredFurniSelectorView', () => ({ WiredFurniSelectorView: () => null }));

import { WiredBaseView } from './WiredBaseView';

const openMenu = () => fireEvent.click(screen.getByRole('button', { name: 'Menu' }));

describe('WiredBaseView quick menu', () => {
    beforeEach(() => {
        for (const value of Object.values(mocks.wired)) if (typeof value === 'function' && 'mockReset' in value) (value as ReturnType<typeof vi.fn>).mockReset();
        mocks.wired.clipboardEntry = null;
        mocks.wired.furniIds = [];
        mocks.roomSettings.canModify = true;
    });

    afterEach(cleanup);

    it('copy pushes the view state first, paste waits for a fitting entry', () => {
        const save = vi.fn();
        const { rerender } = render(<WiredBaseView hasSpecialInput={false} requiresFurni={0} save={save} wiredType="action" />);

        openMenu();
        expect(screen.getByRole('menuitem', { name: 'Paste' })).toBeDisabled();

        fireEvent.click(screen.getByRole('menuitem', { name: 'Copy' }));
        expect(save).toHaveBeenCalledTimes(1);
        expect(mocks.wired.copyWiredToClipboard).toHaveBeenCalledTimes(1);

        mocks.wired.clipboardEntry = { key: 'action:7' };
        rerender(<WiredBaseView hasSpecialInput={false} requiresFurni={0} save={save} wiredType="action" />);
        openMenu();
        fireEvent.click(screen.getByRole('menuitemcheckbox', { name: /Paste into/ }));
        fireEvent.click(screen.getByRole('menuitem', { name: 'Paste' }));
        expect(mocks.wired.pasteWiredFromClipboard).toHaveBeenCalledWith(true);
    });

    it('save without closing goes through the keep-open save', () => {
        const save = vi.fn();
        render(<WiredBaseView hasSpecialInput={false} requiresFurni={0} save={save} wiredType="action" />);

        openMenu();
        fireEvent.click(screen.getByRole('menuitem', { name: 'Save without closing' }));

        expect(save).toHaveBeenCalledTimes(1);
        expect(mocks.wired.saveWiredAndKeepOpen).toHaveBeenCalledTimes(1);
        expect(mocks.wired.saveWired).not.toHaveBeenCalled();
    });

    it('reset and clear picks reach the hook, and everything is off without modify rights', () => {
        mocks.wired.furniIds = [900];
        const { unmount } = render(<WiredBaseView hasSpecialInput={false} requiresFurni={0} save={vi.fn()} wiredType="action" />);

        openMenu();
        fireEvent.click(screen.getByRole('menuitem', { name: 'Clear furni picks' }));
        expect(mocks.wired.clearWiredPicks).toHaveBeenCalledTimes(1);
        openMenu();
        fireEvent.click(screen.getByRole('menuitem', { name: 'Reset to default' }));
        expect(mocks.wired.resetWiredToDefault).toHaveBeenCalledTimes(1);
        unmount();

        mocks.roomSettings.canModify = false;
        render(<WiredBaseView hasSpecialInput={false} requiresFurni={0} save={vi.fn()} wiredType="action" />);
        openMenu();
        expect(screen.getByRole('menuitem', { name: 'Copy' })).toBeDisabled();
        expect(screen.getByRole('menuitem', { name: 'Save without closing' })).toBeDisabled();
    });
});
