import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
let trigger: { stringData: string; intData: number[] } | null = null;
let baseProps: { save: () => void; validate?: () => boolean } | null = null;

vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, setIntParams, setStringParam })
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

import { WiredActionWriteToLogsView } from './WiredActionWriteToLogsView';

describe('WiredActionWriteToLogsView', () => {
    afterEach(cleanup);

    beforeEach(() => {
        setIntParams.mockClear();
        setStringParam.mockClear();
        baseProps = null;
    });

    it('opens a fresh box at info and refuses to save without a message', () => {
        trigger = { stringData: '', intData: [] };
        render(<WiredActionWriteToLogsView />);

        expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('1');
        expect(baseProps.validate()).toBe(false);
    });

    it('shows what the box stored and saves the level, then the user source', () => {
        trigger = { stringData: 'door opened', intData: [2, 5] };
        render(<WiredActionWriteToLogsView />);

        expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('2');
        expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('door opened');

        fireEvent.change(screen.getByRole('combobox'), { target: { value: '3' } });
        fireEvent.change(screen.getByRole('textbox'), { target: { value: '  boss escaped  ' } });
        baseProps.save();

        expect(setIntParams).toHaveBeenCalledWith([3, 5]);
        expect(setStringParam).toHaveBeenCalledWith('boss escaped');
    });
});
