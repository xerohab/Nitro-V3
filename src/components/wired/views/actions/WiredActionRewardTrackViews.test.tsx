import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
let trigger: { stringData: string; intData: number[] } | null = null;
let baseProps: { save: () => void; validate?: () => boolean } | null = null;

vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, setIntParams, setStringParam }),
    useAchievements: () => ({ enabledWiredAchievements: [] })
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

import { normalizeRewardTrackId, WiredActionProgressRewardTrackView } from './WiredActionProgressRewardTrackView';
import { WiredActionResetRewardTrackView } from './WiredActionResetRewardTrackView';

describe('reward track wired actions', () => {
    afterEach(cleanup);

    beforeEach(() => {
        setIntParams.mockClear();
        setStringParam.mockClear();
        baseProps = null;
    });

    it('progress: needs a track and a task, and saves them with the flag, the score and the user source', () => {
        trigger = { stringData: '', intData: [] };
        render(<WiredActionProgressRewardTrackView />);
        expect(baseProps.validate()).toBe(false);
        expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(true);

        fireEvent.change(screen.getByLabelText('track'), { target: { value: 'season 1:x' } });
        fireEvent.change(screen.getByLabelText('task'), { target: { value: 'games' } });
        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.change(screen.getByLabelText('score'), { target: { value: '0' } });
        expect(baseProps.validate()).toBe(true);
        baseProps.save();

        expect(setStringParam).toHaveBeenCalledWith('season1x\tgames');
        expect(setIntParams).toHaveBeenCalledWith([0, 1, 0]);
    });

    it('progress: reads back what the box stored', () => {
        trigger = { stringData: 'season_1\tgames', intData: [0, 25, 201] };
        render(<WiredActionProgressRewardTrackView />);

        expect((screen.getByLabelText('track') as HTMLInputElement).value).toBe('season_1');
        expect((screen.getByLabelText('task') as HTMLInputElement).value).toBe('games');
        expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
        baseProps.save();
        expect(setIntParams).toHaveBeenCalledWith([0, 25, 201]);
    });

    it('reset: saves the track and the user source', () => {
        trigger = { stringData: 'season_1', intData: [200] };
        render(<WiredActionResetRewardTrackView />);

        expect((screen.getByLabelText('track') as HTMLInputElement).value).toBe('season_1');
        baseProps.save();
        expect(setStringParam).toHaveBeenCalledWith('season_1');
        expect(setIntParams).toHaveBeenCalledWith([200]);

        fireEvent.change(screen.getByLabelText('track'), { target: { value: '' } });
        expect(baseProps.validate()).toBe(false);
    });

    it('keeps ids to what the staff editor accepts', () => {
        expect(normalizeRewardTrackId('a.b-c_d')).toBe('a.b-c_d');
        expect(normalizeRewardTrackId('a\tb:c d')).toBe('abcd');
        expect(normalizeRewardTrackId('x'.repeat(80))).toHaveLength(64);
    });
});
