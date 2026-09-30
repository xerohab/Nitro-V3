import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { normalizeRewardTrackId, REWARD_TRACK_ID_MAX_LENGTH } from './WiredActionProgressRewardTrackView';
import { WiredActionBaseView } from './WiredActionBaseView';

/**
 * Habbo's reset-reward-track action (`wf_act_reset_reward_track`): puts the chosen users' tasks of a
 * track back to zero. Points and claimed prizes stay. Server: WiredEffectResetRewardTrack. String
 * param the track id, int params `[user source]`.
 */
export const WiredActionResetRewardTrackView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [trackId, setTrackId] = useState('');
    const [userSource, setUserSource] = useState(0);

    useEffect(() => {
        if (!trigger) return;

        setTrackId(normalizeRewardTrackId(trigger.stringData ?? ''));
        setUserSource(trigger.intData?.[0] ?? 0);
    }, [trigger]);

    const save = () => {
        setStringParam(trackId);
        setIntParams([userSource]);
    };

    return (
        <WiredActionBaseView
            footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            validate={() => trackId.length > 0}
        >
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.reward_track.reset.track', 'Reward track to reset')}</Text>
                <input
                    aria-label="track"
                    className="form-control form-control-sm"
                    maxLength={REWARD_TRACK_ID_MAX_LENGTH}
                    placeholder={localizeWithFallback('wiredfurni.params.reward_track.track_id', 'Track ID')}
                    value={trackId}
                    onChange={(event) => setTrackId(normalizeRewardTrackId(event.target.value))}
                />
                <Text small>
                    {localizeWithFallback(
                        'wiredfurni.params.reward_track.reset.hint',
                        'Points and claimed prizes stay, and levels already paid do not pay again.'
                    )}
                </Text>
            </div>
        </WiredActionBaseView>
    );
};
