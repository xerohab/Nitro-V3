import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

/**
 * Habbo's "write to logs" (`wf_act_log`, and `wf_act_neg_log` for when the conditions fail): a
 * message written into the room's wired log at a level, where the room log window lists it.
 * Server: WiredEffectLog. Int params `[level, user source]`, string param the message.
 */

/** Habbo's four levels, in the order the room log window numbers them. */
export const WRITE_TO_LOGS_LEVELS: Array<{ fallback: string; value: number }> = [
    { fallback: 'Debug', value: 0 },
    { fallback: 'Info', value: 1 },
    { fallback: 'Warning', value: 2 },
    { fallback: 'Error', value: 3 }
];

export const WRITE_TO_LOGS_MESSAGE_MAX_LENGTH = 400;
const DEFAULT_LEVEL = 1;

const normalizeLevel = (value: number): number => (Number.isInteger(value) && value >= 0 && value <= 3 ? value : DEFAULT_LEVEL);

export const WiredActionWriteToLogsView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [message, setMessage] = useState('');
    const [level, setLevel] = useState(DEFAULT_LEVEL);
    const [userSource, setUserSource] = useState(0);

    useEffect(() => {
        if (!trigger) return;

        setMessage(trigger.stringData ?? '');
        setLevel(normalizeLevel(trigger.intData?.[0]));
        setUserSource(trigger.intData?.[1] ?? 0);
    }, [trigger]);

    const save = () => {
        setStringParam(message.trim());
        setIntParams([level, userSource]);
    };

    return (
        <WiredActionBaseView
            footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            validate={() => message.trim().length > 0}
        >
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.write_to_logs.log_level', 'Log level')}</Text>
                <select className="form-select form-select-sm" value={level} onChange={(event) => setLevel(normalizeLevel(parseInt(event.target.value, 10)))}>
                    {WRITE_TO_LOGS_LEVELS.map((entry) => (
                        <option key={entry.value} value={entry.value}>
                            {localizeWithFallback(`wiredfurni.params.write_to_logs.log_level.${entry.value}`, entry.fallback)}
                        </option>
                    ))}
                </select>
            </div>
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.write_to_logs.message', 'Message')}</Text>
                <textarea
                    className="form-control form-control-sm"
                    maxLength={WRITE_TO_LOGS_MESSAGE_MAX_LENGTH}
                    rows={4}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                />
                <Text small>
                    {localizeWithFallback(
                        'wiredfurni.params.write_to_logs.hint',
                        'Shows up in the room log of the wired tools. Placeholders from the text add-ons in the stack are filled in.'
                    )}
                </Text>
            </div>
        </WiredActionBaseView>
    );
};
