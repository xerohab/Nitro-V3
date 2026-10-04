import { FC } from 'react';
import { useUI2 } from '../UI2Context';

interface UI2SettingsProps
{
    open: boolean;
    onClose: () => void;
}

interface ColourOption
{
    value: string;
    label: string;
    preview?: string;
}

interface SeasonalTheme
{
    id: string;
    label: string;
    icon: string;
    colour: string;
    preview: string;
}

const COLOURS: ColourOption[] = [
    { value: '#3b82f6', label: 'Blue' },
    { value: '#8b5cf6', label: 'Purple' },
    { value: '#ec4899', label: 'Pink' },
    { value: '#ef4444', label: 'Red' },
    { value: '#f59e0b', label: 'Orange' },
    { value: '#10b981', label: 'Green' },

    { value: '#06b6d4', label: 'Cyan' },
    { value: '#64748b', label: 'Slate' },
    { value: '#7C2C3B', label: 'Claret' },
    { value: '#be123c', label: 'Crimson' },
    { value: '#0f8b8d', label: 'Teal' },
    { value: '#15803d', label: 'Emerald' },

    { value: '#4f46e5', label: 'Indigo' },
    { value: '#ca8a04', label: 'Gold' },
    { value: '#ffffff', label: 'White' },
    { value: '#090909', label: 'Black' },
    { value: '#795548', label: 'Brown' },
    { value: '#c0c0c0', label: 'Silver' },

    { value: '#6b7d32', label: 'Olive Green' },
    { value: '#d8c3a5', label: 'Beige' },
    { value: '#4c1d95', label: 'Dark Purple' },
    { value: '#172554', label: 'Royal Navy' },
    { value: '#14B8A6', label: 'Turquoise' },
    {
        value: '#ff3b30',
        label: 'Rainbow',
        preview: 'linear-gradient(90deg, #ff3b30 0%, #ff9500 17%, #ffcc00 33%, #34c759 50%, #00a7e1 67%, #5856d6 83%, #af52de 100%)'
    }
];

const SEASONAL_THEMES: SeasonalTheme[] = [
    {
        id: 'halloween',
        label: 'Halloween',
        icon: '🎃',
        colour: '#f97316',
        preview: 'linear-gradient(135deg, #090909 0%, #4c1d95 48%, #f97316 100%)'
    },
    {
        id: 'christmas',
        label: 'Christmas',
        icon: '☃️',
        colour: '#15803d',
        preview: 'linear-gradient(135deg, #b91c1c 0%, #15803d 55%, #f8fafc 100%)'
    },
    {
        id: 'valentines',
        label: "Valentine's",
        icon: '❤️',
        colour: '#ec4899',
        preview: 'linear-gradient(135deg, #9f1239 0%, #ec4899 55%, #fecdd3 100%)'
    },
    {
        id: 'easter',
        label: 'Easter',
        icon: '🐰',
        colour: '#a78bfa',
        preview: 'linear-gradient(135deg, #f9a8d4 0%, #fde68a 34%, #93c5fd 67%, #c4b5fd 100%)'
    },
    {
        id: 'summer',
        label: 'Summer',
        icon: '☀️',
        colour: '#f59e0b',
        preview: 'linear-gradient(135deg, #facc15 0%, #f97316 50%, #06b6d4 100%)'
    },
    {
        id: 'winter',
        label: 'Winter',
        icon: '❄️',
        colour: '#60a5fa',
        preview: 'linear-gradient(135deg, #e0f2fe 0%, #60a5fa 48%, #c0c0c0 100%)'
    },
    {
        id: 'autumn',
        label: 'Autumn',
        icon: '🍂',
        colour: '#a16207',
        preview: 'linear-gradient(135deg, #78350f 0%, #c2410c 48%, #6b7d32 100%)'
    },
    {
        id: 'stpatricks',
        label: "St Patrick's",
        icon: '☘️',
        colour: '#15803d',
        preview: 'linear-gradient(135deg, #064e3b 0%, #15803d 52%, #facc15 100%)'
    },
    {
        id: 'newyear',
        label: 'New Year',
        icon: '🎆',
        colour: '#4338ca',
        preview: 'linear-gradient(135deg, #09090b 0%, #312e81 48%, #facc15 100%)'
    },
    {
        id: 'bonfire',
        label: 'Bonfire Night',
        icon: '🎇',
        colour: '#ea580c',
        preview: 'linear-gradient(135deg, #111827 0%, #7c2d12 45%, #f97316 72%, #facc15 100%)'
    },
    {
        id: 'oktoberfest',
        label: 'Oktoberfest',
        icon: '🍺',
        colour: '#2563eb',
        preview: 'linear-gradient(135deg, #2563eb 0%, #f8fafc 48%, #f59e0b 100%)'
    },
    {
        id: 'spring',
        label: 'Spring',
        icon: '🌷',
        colour: '#db2777',
        preview: 'linear-gradient(135deg, #86efac 0%, #f9a8d4 48%, #fde68a 100%)'
    }
];

export const UI2Settings: FC<UI2SettingsProps> = ({ open, onClose }) =>
{
    const {
        colour,
        setColour,
        theme,
        setTheme
    } = useUI2();

    if(!open) return null;

    const chooseColour = (value: string, label: string) =>
    {
        setTheme(label === 'Rainbow' ? 'rainbow' : 'solid');
        setColour(value);
    };

    const chooseSeasonalTheme = (option: SeasonalTheme) =>
    {
        setTheme(option.id);
        setColour(option.colour);
    };

    return (
        <div
            className="solace-ui2-settings"
            role="dialog"
            aria-modal="false"
            aria-label="UI2 Appearance"
        >
            <div className="solace-ui2-settings-header">
                <strong>UI2 Appearance</strong>

                <button
                    type="button"
                    className="solace-ui2-settings-close"
                    onClick={onClose}
                    aria-label="Close UI2 Appearance"
                    title="Close"
                >
                    ×
                </button>
            </div>

            <div className="solace-ui2-theme-section">
                <div className="solace-ui2-theme-section-title">
                    Colours
                </div>

                <div className="solace-ui2-colours">
                    {COLOURS.map(option => (
                        <button
                            key={option.label}
                            type="button"
                            title={option.label}
                            aria-label={`Use ${option.label} UI colour`}
                            className={`solace-ui2-colour-option ${
                                (
                                    option.label === 'Rainbow'
                                        ? theme === 'rainbow'
                                        : theme === 'solid' && colour === option.value
                                )
                                    ? 'is-selected'
                                    : ''
                            } ${option.label === 'Rainbow' ? 'is-rainbow' : ''}`}
                            style={{
                                background: option.preview ?? option.value
                            }}
                            onClick={() => chooseColour(option.value, option.label)}
                        />
                    ))}
                </div>
            </div>

            <div className="solace-ui2-theme-section solace-ui2-seasonal-section">
                <div className="solace-ui2-theme-section-title">
                    Seasonal Themes
                </div>

                <div className="solace-ui2-seasonal-themes">
                    {SEASONAL_THEMES.map(option => (
                        <button
                            key={option.id}
                            type="button"
                            title={option.label}
                            aria-label={`Use ${option.label} UI theme`}
                            className={`solace-ui2-seasonal-option ${
                                theme === option.id ? 'is-selected' : ''
                            }`}
                            style={{ background: option.preview }}
                            onClick={() => chooseSeasonalTheme(option)}
                        >
                            <span
                                className="solace-ui2-seasonal-icon"
                                aria-hidden="true"
                            >
                                {option.icon}
                            </span>

                            <span className="solace-ui2-seasonal-label">
                                {option.label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
