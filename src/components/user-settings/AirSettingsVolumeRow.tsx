import { ChangeEvent, FC, KeyboardEvent, useEffect, useRef } from 'react';

interface AirSettingsVolumeRowProps {
    id: string;
    label: string;
    muteLabel: string;
    maximumLabel: string;
    value: number;
    onChange: (value: number) => void;
    onCommit: (value: number) => void;
}

const COMMIT_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'];

export const AirSettingsVolumeRow: FC<AirSettingsVolumeRowProps> = ({ id, label, muteLabel, maximumLabel, value, onChange, onCommit }) => {
    const pendingValueRef = useRef(value);

    useEffect(() => {
        pendingValueRef.current = value;
    }, [value]);

    const changeValue = (event: ChangeEvent<HTMLInputElement>) => {
        const nextValue = Number(event.currentTarget.value);

        pendingValueRef.current = nextValue;
        onChange(nextValue);
    };

    const commitValue = () => onCommit(pendingValueRef.current);

    const commitKeyboardValue = (event: KeyboardEvent<HTMLInputElement>) => {
        if (COMMIT_KEYS.includes(event.key)) commitValue();
    };

    const setDirectValue = (nextValue: number) => {
        pendingValueRef.current = nextValue;
        onChange(nextValue);
        onCommit(nextValue);
    };

    return (
        <div className="air-settings-volume-row">
            <label className="air-settings-volume-row__label" htmlFor={id}>
                {label}
            </label>
            <button
                aria-label={`${label}: ${muteLabel}`}
                className="air-settings-volume-row__speaker air-settings-volume-row__speaker--off"
                onClick={() => setDirectValue(0)}
                type="button"
            />
            <div className="air-settings-volume-row__slider">
                <input
                    aria-label={label}
                    id={id}
                    max="100"
                    min="0"
                    step="1"
                    type="range"
                    value={value}
                    onBlur={commitValue}
                    onChange={changeValue}
                    onKeyUp={commitKeyboardValue}
                    onMouseUp={commitValue}
                    onTouchEnd={commitValue}
                />
            </div>
            <button
                aria-label={`${label}: ${maximumLabel}`}
                className="air-settings-volume-row__speaker air-settings-volume-row__speaker--on"
                onClick={() => setDirectValue(100)}
                type="button"
            />
        </div>
    );
};
