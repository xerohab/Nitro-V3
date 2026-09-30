import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
let trigger: { stringData: string; intData: number[] } | null = null;
let enabledWiredAchievements: string[] = [];
let baseProps: { save: () => void; validate?: () => boolean } | null = null;

vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, setIntParams, setStringParam }),
    useAchievements: () => ({ enabledWiredAchievements })
}));

vi.mock('../../../../common', () => ({
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
}));

vi.mock('../WiredSourcesSelector', () => ({
    WiredSourcesSelector: () => <div>sources</div>
}));

vi.mock('./WiredActionBaseView', () => ({
    WiredActionBaseView: (props: PropsWithChildren<{ save: () => void; validate?: () => boolean }>) => {
        baseProps = { save: props.save, validate: props.validate };
        return <div>{props.children}</div>;
    }
}));

import { clampProgressAmount, WiredActionProgressAchievementView } from './WiredActionProgressAchievementView';

describe('WiredActionProgressAchievementView', () => {
    afterEach(cleanup);

    beforeEach(() => {
        setIntParams.mockClear();
        setStringParam.mockClear();
        baseProps = null;
        enabledWiredAchievements = [];
    });

    it('explains the enabler when the room offers no achievement and refuses to save', () => {
        trigger = { stringData: '', intData: [] };
        render(<WiredActionProgressAchievementView />);

        expect(screen.queryByRole('combobox')).toBeNull();
        expect(screen.getByText(/achievement enabler/)).toBeTruthy();
        expect(baseProps.validate()).toBe(false);
    });

    it('offers the room achievements and saves the name, the mode, the amount and the user source', () => {
        enabledWiredAchievements = ['ACH_Game', 'ACH_Race'];
        trigger = { stringData: 'ACH_Game', intData: [1, 3, 200] };
        render(<WiredActionProgressAchievementView />);

        const select = screen.getByRole('combobox') as HTMLSelectElement;
        expect(select.value).toBe('ACH_Game');
        fireEvent.change(select, { target: { value: 'ACH_Race' } });
        fireEvent.click(screen.getAllByRole('radio')[1]);
        fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '5000000' } });
        baseProps.save();

        expect(setStringParam).toHaveBeenCalledWith('ACH_Race');
        expect(setIntParams).toHaveBeenCalledWith([0, 1_000_000, 200]);
    });

    it('keeps a stored name the room no longer lists so the box can be read back', () => {
        enabledWiredAchievements = ['ACH_Race'];
        trigger = { stringData: 'ACH_Old', intData: [1, 1, 0] };
        render(<WiredActionProgressAchievementView />);

        expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('ACH_Old');
        expect(baseProps.validate()).toBe(true);
    });

    it('clamps the amount to what the server accepts', () => {
        expect(clampProgressAmount(-4)).toBe(1);
        expect(clampProgressAmount(Number.NaN)).toBe(1);
        expect(clampProgressAmount(2.9)).toBe(2);
        expect(clampProgressAmount(9_999_999)).toBe(1_000_000);
    });
});
