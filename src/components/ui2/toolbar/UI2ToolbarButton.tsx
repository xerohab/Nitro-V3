import { FC, MouseEventHandler } from 'react';

interface Props
{
    icon: string;
    label: string;
    onClick: MouseEventHandler<HTMLButtonElement>;
    active?: boolean;
}

export const UI2ToolbarButton: FC<Props> = ({
    icon,
    label,
    onClick,
    active = false
}) =>
{
    return (
        <button
            type="button"
            className={`solace-ui2-toolbar-button ${active ? 'is-active' : ''}`}
            onClick={onClick}
            title={label}
            aria-label={label}
        >
            <span
                className={`solace-ui2-real-icon octane-icon icon-${icon}`}
                aria-hidden="true"
            />
        </button>
    );
};
