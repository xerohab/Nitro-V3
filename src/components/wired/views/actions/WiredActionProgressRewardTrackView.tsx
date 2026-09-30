import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { clampProgressAmount, PROGRESS_ACHIEVEMENT_MAX_AMOUNT } from './WiredActionProgressAchievementView';
import { WiredActionBaseView } from './WiredActionBaseView';

/**
 * Habbo's progress-reward-track action (`wf_act_progress_reward_track`): moves one task of a reward
 * track for the chosen users. Server: WiredEffectProgressRewardTrack. String param `track\ttask`,
 * int params `[add to existing, amount, user source]`. The hotel decides which tracks wired may move.
 */

export const REWARD_TRACK_ID_MAX_LENGTH = 64;

export const normalizeRewardTrackId = (value: string): string => (value ?? '').replace(/[^\p{L}\p{N}_.-]/gu, '').slice(0, REWARD_TRACK_ID_MAX_LENGTH);

export const WiredActionProgressRewardTrackView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [trackId, setTrackId] = useState('');
    const [taskId, setTaskId] = useState('');
    const [addToExisting, setAddToExisting] = useState(true);
    const [amount, setAmount] = useState(1);
    const [userSource, setUserSource] = useState(0);

    useEffect(() => {
        if (!trigger) return;

        const [track = '', task = ''] = (trigger.stringData ?? '').split('\t');

        setTrackId(normalizeRewardTrackId(track));
        setTaskId(normalizeRewardTrackId(task));
        setAddToExisting((trigger.intData?.[0] ?? 1) !== 0);
        setAmount(clampProgressAmount(trigger.intData?.[1] ?? 1));
        setUserSource(trigger.intData?.[2] ?? 0);
    }, [trigger]);

    const save = () => {
        setStringParam(`${trackId}\t${taskId}`);
        setIntParams([addToExisting ? 1 : 0, clampProgressAmount(amount), userSource]);
    };

    return (
        <WiredActionBaseView
            footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            validate={() => trackId.length > 0 && taskId.length > 0}
        >
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.reward_track.progress.ids', 'Reward track')}</Text>
                <input
                    aria-label="track"
                    className="form-control form-control-sm"
                    maxLength={REWARD_TRACK_ID_MAX_LENGTH}
                    placeholder={localizeWithFallback('wiredfurni.params.reward_track.track_id', 'Track ID')}
                    value={trackId}
                    onChange={(event) => setTrackId(normalizeRewardTrackId(event.target.value))}
                />
                <input
                    aria-label="task"
                    className="form-control form-control-sm"
                    maxLength={REWARD_TRACK_ID_MAX_LENGTH}
                    placeholder={localizeWithFallback('wiredfurni.params.reward_track.task_id', 'Task ID')}
                    value={taskId}
                    onChange={(event) => setTaskId(normalizeRewardTrackId(event.target.value))}
                />
            </div>
            <label className="flex items-center gap-1">
                <input type="checkbox" className="form-check-input" checked={addToExisting} onChange={(event) => setAddToExisting(event.target.checked)} />
                <Text>{localizeWithFallback('wiredfurni.params.reward_track.add_to_existing_score', 'Add to the existing score')}</Text>
            </label>
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.reward_track.score', 'Score')}</Text>
                <input
                    aria-label="score"
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
