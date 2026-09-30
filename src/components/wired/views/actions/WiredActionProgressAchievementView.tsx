import { FC, useEffect, useMemo, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useAchievements, useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

/**
 * Habbo's progress-achievement action (`wf_act_progress_achievement`): progresses one of the room's
 * achievements for the chosen users. The list is the room's `WiredEnvironment.enabledAchievements`:
 * what its achievement enablers name and the hotel allows.
 * Server: WiredEffectProgressAchievement. String param the name, int params `[mode, amount, user source]`.
 */

export const PROGRESS_ACHIEVEMENT_MODE_RAISE_TO = 0;
export const PROGRESS_ACHIEVEMENT_MODE_ADD = 1;
export const PROGRESS_ACHIEVEMENT_MAX_AMOUNT = 1_000_000;

export const clampProgressAmount = (value: number): number =>
    Number.isFinite(value) ? Math.min(PROGRESS_ACHIEVEMENT_MAX_AMOUNT, Math.max(1, Math.trunc(value))) : 1;

const normalizeMode = (value: number): number => (value === PROGRESS_ACHIEVEMENT_MODE_RAISE_TO ? PROGRESS_ACHIEVEMENT_MODE_RAISE_TO : PROGRESS_ACHIEVEMENT_MODE_ADD);

export const WiredActionProgressAchievementView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const { enabledWiredAchievements = [] } = useAchievements();
    const [achievement, setAchievement] = useState('');
    const [mode, setMode] = useState(PROGRESS_ACHIEVEMENT_MODE_ADD);
    const [amount, setAmount] = useState(1);
    const [userSource, setUserSource] = useState(0);

    useEffect(() => {
        if (!trigger) return;

        setAchievement(trigger.stringData ?? '');
        setMode(normalizeMode(trigger.intData?.[0] ?? PROGRESS_ACHIEVEMENT_MODE_ADD));
        setAmount(clampProgressAmount(trigger.intData?.[1] ?? 1));
        setUserSource(trigger.intData?.[2] ?? 0);
    }, [trigger]);

    const options = useMemo(() => {
        const names = [...enabledWiredAchievements];

        if (achievement && !names.includes(achievement)) names.unshift(achievement);

        return names;
    }, [enabledWiredAchievements, achievement]);

    const save = () => {
        setStringParam(achievement);
        setIntParams([mode, clampProgressAmount(amount), userSource]);
    };

    return (
        <WiredActionBaseView
            footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            validate={() => achievement.length > 0}
        >
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.progress_achievement.name', 'Achievement')}</Text>
                {options.length ? (
                    <select className="form-select form-select-sm" value={achievement} onChange={(event) => setAchievement(event.target.value)}>
                        {!achievement && <option value="">{localizeWithFallback('wiredfurni.params.progress_achievement.pick', 'Pick an achievement')}</option>}
                        {options.map((name) => (
                            <option key={name} value={name}>
                                {name}
                            </option>
                        ))}
                    </select>
                ) : (
                    <Text small>
                        {localizeWithFallback(
                            'wiredfurni.params.progress_achievement.none',
                            'No achievements in this room. Name them in an achievement enabler add-on; the hotel must allow them too.'
                        )}
                    </Text>
                )}
            </div>
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.progress_achievement.mode', 'Progress')}</Text>
                {[PROGRESS_ACHIEVEMENT_MODE_ADD, PROGRESS_ACHIEVEMENT_MODE_RAISE_TO].map((value) => (
                    <label key={value} className="flex items-center gap-1">
                        <input type="radio" className="form-check-input" name="progressAchievementMode" checked={mode === value} onChange={() => setMode(value)} />
                        <Text>
                            {localizeWithFallback(
                                `wiredfurni.params.progress_achievement.mode.${value}`,
                                value === PROGRESS_ACHIEVEMENT_MODE_ADD ? 'Add the amount' : 'Raise the progress to the amount'
                            )}
                        </Text>
                    </label>
                ))}
            </div>
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.progress_achievement.score', 'Amount')}</Text>
                <input
                    type="number"
                    min={1}
                    max={PROGRESS_ACHIEVEMENT_MAX_AMOUNT}
                    className="form-control form-control-sm"
                    style={{ maxWidth: 140 }}
                    value={amount}
                    onChange={(event) => setAmount(clampProgressAmount(parseInt(event.target.value, 10)))}
                />
            </div>
        </WiredActionBaseView>
    );
};
