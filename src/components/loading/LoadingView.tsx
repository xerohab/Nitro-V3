import { GetConfiguration } from '@nitrots/nitro-renderer';

import { FC, useEffect, useMemo, useRef, useState } from 'react';

import nitroV3Logo from '@/assets/images/notifications/nitro_v3.png';
import './LoadingView.css';

interface LoadingViewProps {
    isError?: boolean;
    message?: string;
    homeUrl?: string;
    progress?: number;
    currentTask?: string;
}

const resolveConfigUrl = (key: string): string => {
    try {
        const raw = GetConfiguration().getValue<string>(key, '');
        if (!raw) return '';

        return GetConfiguration().interpolate(raw) || raw;
    } catch {
        return '';
    }
};

const DEFAULT_TIPS = [
    'Meet friends, build rooms and make Lounge your own.',
    'Check the catalogue for new furniture and seasonal releases.',
    'Use the Navigator to discover rooms, games and events.',
    'Never share your password or account details with anybody.',
    'Keep an eye on the Lounge website for hotel news and updates.',
    'Use the Friends list to see who is online and join them quickly.',
    'Decorate your rooms with furniture from the Shop and your Inventory.',
    'Respect other players and help keep Lounge welcoming for everyone.',
    'Try different rooms and events to discover more of the community.',
    'Your Inventory keeps the furniture, badges and items you collect.',
    'Use Messenger to stay in touch with friends while exploring the hotel.',
    'Look out for limited furniture and special seasonal releases.',
    'Create your own rooms, invite friends and make them uniquely yours.',
    'If something looks wrong, refresh the client before trying again.'
];

interface LoadingScreenConfig {
    enabled: boolean;
    background_url: string;
    logo_url: string;
    tips_enabled: boolean;
    rotation_seconds: number;
    panel_opacity: number;
    headings: { preparing: string; loading: string; almost: string; complete: string };
    progress_colors: { start: string; middle: string; end: string };
    tips: string[];
}

const DEFAULT_CONFIG: LoadingScreenConfig = {
    enabled: true,
    background_url: '',
    logo_url: '',
    tips_enabled: true,
    rotation_seconds: 5,
    panel_opacity: 0.72,
    headings: { preparing: 'Preparing Lounge', loading: 'Loading Hotel', almost: 'Almost there...', complete: 'Welcome to Lounge!' },
    progress_colors: { start: '#8a4d00', middle: '#eba915', end: '#ffd85e' },
    tips: DEFAULT_TIPS
};

const getLoadingHeading = (progress: number | null, config: LoadingScreenConfig): string => {
    if (progress === null) return config.headings.preparing;
    if (progress >= 100) return config.headings.complete;
    if (progress >= 60) return config.headings.almost;
    if (progress >= 25) return config.headings.loading;
    return config.headings.preparing;
};

const getFallbackTask = (progress: number | null): string => {
    if (progress === null) return 'Preparing Lounge Hotel...';
    if (progress >= 100) return 'Everything is ready — welcome in!';
    if (progress >= 90) return 'Finalising your hotel session...';
    if (progress >= 60) return 'Finishing the last few things...';
    if (progress >= 25) return 'Loading hotel resources...';
    return 'Starting your Lounge session...';
};

export const LoadingView: FC<LoadingViewProps> = ({
    isError = false,
    message = '',
    homeUrl = '',
    progress,
    currentTask = ''
}) => {
    const customLogoUrl = useMemo(() => resolveConfigUrl('loading.logo.url'), []);
    const customBackground = useMemo(() => resolveConfigUrl('loading.background'), []);
    const [remoteConfig, setRemoteConfig] = useState<LoadingScreenConfig>(DEFAULT_CONFIG);
    const [tipIndex, setTipIndex] = useState(0);
    const [displayProgress, setDisplayProgress] = useState<number | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const displayedProgressRef = useRef<number | null>(null);

    const targetProgress = typeof progress === 'number' && Number.isFinite(progress)
        ? Math.max(0, Math.min(100, Math.round(progress)))
        : null;

    useEffect(() => {
        const controller = new AbortController();

        fetch('/api/client/loading-screen', {
            method: 'GET',
            headers: { Accept: 'application/json' },
            cache: 'no-store',
            signal: controller.signal
        })
            .then(response => {
                if (!response.ok) throw new Error(`Loading screen API returned ${response.status}`);
                return response.json();
            })
            .then((data: Partial<LoadingScreenConfig>) => {
                setRemoteConfig({
                    ...DEFAULT_CONFIG,
                    ...data,
                    headings: { ...DEFAULT_CONFIG.headings, ...(data.headings || {}) },
                    progress_colors: { ...DEFAULT_CONFIG.progress_colors, ...(data.progress_colors || {}) },
                    tips: Array.isArray(data.tips) && data.tips.length ? data.tips.filter(tip => typeof tip === 'string' && tip.trim()) : DEFAULT_TIPS
                });
            })
            .catch(error => {
                if (error?.name !== 'AbortError') console.warn('[Lounge Loading] Using built-in fallback configuration.', error);
            });

        return () => controller.abort();
    }, []);

    const tips = remoteConfig.tips.length ? remoteConfig.tips : DEFAULT_TIPS;

    useEffect(() => {
        if (isError) return;

        const interval = window.setInterval(() => {
            setTipIndex(value => (value + 1) % tips.length);
        }, Math.max(2, remoteConfig.rotation_seconds || 5) * 1000);

        return () => window.clearInterval(interval);
    }, [isError, remoteConfig.rotation_seconds, tips.length]);

    useEffect(() => {
        if (animationFrameRef.current !== null) {
            window.cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        if (targetProgress === null) {
            displayedProgressRef.current = null;
            setDisplayProgress(null);
            return;
        }

        const startValue = displayedProgressRef.current === null
            ? targetProgress
            : displayedProgressRef.current;

        const difference = targetProgress - startValue;

        if (Math.abs(difference) < 0.5) {
            displayedProgressRef.current = targetProgress;
            setDisplayProgress(targetProgress);
            return;
        }

        const startedAt = performance.now();
        const duration = Math.min(650, Math.max(220, Math.abs(difference) * 18));

        const animate = (now: number) => {
            const elapsed = Math.min(1, (now - startedAt) / duration);
            const eased = 1 - Math.pow(1 - elapsed, 3);
            const next = startValue + (difference * eased);

            displayedProgressRef.current = next;
            setDisplayProgress(next);

            if (elapsed < 1) {
                animationFrameRef.current = window.requestAnimationFrame(animate);
            } else {
                displayedProgressRef.current = targetProgress;
                setDisplayProgress(targetProgress);
                animationFrameRef.current = null;
            }
        };

        animationFrameRef.current = window.requestAnimationFrame(animate);

        return () => {
            if (animationFrameRef.current !== null) {
                window.cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        };
    }, [targetProgress]);

    const roundedDisplayProgress = displayProgress === null
        ? null
        : Math.max(0, Math.min(100, Math.round(displayProgress)));

    const heading = getLoadingHeading(roundedDisplayProgress, remoteConfig);
    const isComplete = roundedDisplayProgress !== null && roundedDisplayProgress >= 100;
    const statusText = isComplete
        ? 'Everything is ready — welcome in!'
        : (currentTask || message || getFallbackTask(roundedDisplayProgress));

    const effectiveBackground = remoteConfig.enabled && remoteConfig.background_url ? remoteConfig.background_url : customBackground;
    const effectiveLogo = remoteConfig.enabled && remoteConfig.logo_url ? remoteConfig.logo_url : customLogoUrl;
    const backgroundStyle = ({
        ...(effectiveBackground ? { '--lounge-loading-background': `url("${effectiveBackground}")` } : {}),
        '--lounge-loading-panel-opacity': String(Math.max(0.2, Math.min(0.98, remoteConfig.panel_opacity || 0.72))),
        '--lounge-loading-progress-start': remoteConfig.progress_colors.start,
        '--lounge-loading-progress-middle': remoteConfig.progress_colors.middle,
        '--lounge-loading-progress-end': remoteConfig.progress_colors.end
    } as React.CSSProperties);

    return (
        <div className={`lounge-loading-v2${isComplete ? ' lounge-loading-v2--complete' : ''}`} style={backgroundStyle}>
            <div className="lounge-loading-v2__background" aria-hidden="true" />
            <div className="lounge-loading-v2__shade" aria-hidden="true" />

            {isError ? (
                <div className="lounge-loading-v2__error" role="alert">
                    <img
                        src={effectiveLogo || nitroV3Logo}
                        alt="Lounge Hotel"
                        draggable={false}
                        className="lounge-loading-v2__error-logo"
                    />
                    <div className="lounge-loading-v2__error-title">Unable to enter Lounge Hotel</div>
                    <div className="lounge-loading-v2__error-message">{message || 'An unexpected connection error occurred.'}</div>
                    {homeUrl ? <a className="lounge-loading-v2__button" href={homeUrl}>Back to Hotel</a> : null}
                </div>
            ) : (
                <div className={`lounge-loading-v2__panel${isComplete ? ' lounge-loading-v2__panel--complete' : ''}`} aria-live="polite">
                    <div className="lounge-loading-v2__panel-head">
                        <div className="lounge-loading-v2__heading-copy">
                            <div className="lounge-loading-v2__eyebrow">LOUNGE HOTEL</div>
                            <div className="lounge-loading-v2__title">{heading}</div>
                        </div>
                        <div className="lounge-loading-v2__percent">
                            {roundedDisplayProgress === null ? 'LOADING' : `${roundedDisplayProgress}%`}
                        </div>
                    </div>

                    <div className="lounge-loading-v2__track" aria-label="Loading progress">
                        <div
                            className={`lounge-loading-v2__fill${roundedDisplayProgress === null ? ' lounge-loading-v2__fill--indeterminate' : ''}${isComplete ? ' lounge-loading-v2__fill--complete' : ''}`}
                            style={roundedDisplayProgress === null ? undefined : { width: `${displayProgress ?? 0}%` }}
                        >
                            <span className="lounge-loading-v2__shine" />
                        </div>
                    </div>

                    <div className={`lounge-loading-v2__status${isComplete ? ' lounge-loading-v2__status--complete' : ''}`}>
                        <span className="lounge-loading-v2__pulse" aria-hidden="true" />
                        <span>{statusText}</span>
                    </div>

                    {remoteConfig.tips_enabled && tips.length ? (
                        <div className="lounge-loading-v2__tip">
                            <strong>TIP</strong>
                            <span key={tipIndex} className="lounge-loading-v2__tip-copy">{tips[tipIndex % tips.length]}</span>
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
};
