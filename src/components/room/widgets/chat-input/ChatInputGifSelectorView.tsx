import * as Popover from '@radix-ui/react-popover';
import { FC, FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { GetConfigurationValue } from '../../../../api';

interface ChatInputGifSelectorViewProps {
    sendGif: (id: string) => void;
}

interface GiphyImage {
    id: string;
    title?: string;
    images?: {
        fixed_width_small?: {
            url?: string;
            webp?: string;
        };
        fixed_width?: {
            url?: string;
            webp?: string;
        };
    };
}

interface GiphyResponse {
    data?: GiphyImage[];
}

const GIPHY_ID_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;

const getPreviewUrl = (gif: GiphyImage): string => {
    return (
        gif.images?.fixed_width_small?.webp ||
        gif.images?.fixed_width_small?.url ||
        gif.images?.fixed_width?.webp ||
        gif.images?.fixed_width?.url ||
        ''
    );
};

export const ChatInputGifSelectorView: FC<ChatInputGifSelectorViewProps> = ({ sendGif }) => {
    const [selectorVisible, setSelectorVisible] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<GiphyImage[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const requestIdRef = useRef(0);

    const enabled = GetConfigurationValue<boolean>('giphy.enabled', true);
    const apiKey = GetConfigurationValue<string>('giphy.api.key', '');
    const rating = GetConfigurationValue<string>('giphy.rating', 'pg-13');
    const configuredLimit = GetConfigurationValue<number>('giphy.results.limit', 24);
    const limit = Math.max(1, Math.min(48, Number(configuredLimit) || 24));

    const loadGifs = useCallback(
        async (searchValue: string) => {
            if (!apiKey) {
                setError('GIPHY API key is missing.');
                setResults([]);
                return;
            }

            const requestId = ++requestIdRef.current;

            setLoading(true);
            setError('');

            try {
                const trimmed = searchValue.trim();

                const endpoint = trimmed
                    ? 'https://api.giphy.com/v1/gifs/search'
                    : 'https://api.giphy.com/v1/gifs/trending';

                const url = new URL(endpoint);

                url.searchParams.set('api_key', apiKey);
                url.searchParams.set('limit', String(limit));
                url.searchParams.set('rating', rating);

                if (trimmed) url.searchParams.set('q', trimmed);

                const response = await fetch(url.toString(), {
                    method: 'GET',
                    credentials: 'omit'
                });

                if (!response.ok) throw new Error(`GIPHY returned HTTP ${response.status}`);

                const payload = (await response.json()) as GiphyResponse;

                if (requestId !== requestIdRef.current) return;

                setResults(
                    (Array.isArray(payload.data) ? payload.data : []).filter(
                        (gif) => !!gif?.id && GIPHY_ID_PATTERN.test(gif.id) && !!getPreviewUrl(gif)
                    )
                );
            } catch (err) {
                if (requestId !== requestIdRef.current) return;

                console.warn('[GIPHY] Failed to load GIFs:', err);
                setResults([]);
                setError('Unable to load GIFs right now.');
            } finally {
                if (requestId === requestIdRef.current) setLoading(false);
            }
        },
        [apiKey, limit, rating]
    );

    useEffect(() => {
        if (!selectorVisible || !enabled || !apiKey) return;

        const timer = window.setTimeout(() => {
            void loadGifs(query);
        }, query.trim() ? 350 : 0);

        return () => window.clearTimeout(timer);
    }, [selectorVisible, query, enabled, apiKey, loadGifs]);

    const submitSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void loadGifs(query);
    };

    const selectGif = (gif: GiphyImage) => {
        if (!GIPHY_ID_PATTERN.test(gif.id)) return;

        sendGif(gif.id);
        setSelectorVisible(false);
    };

    if (!enabled) return null;

    return (
        <Popover.Root open={selectorVisible} onOpenChange={setSelectorVisible}>
            <Popover.Trigger asChild>
                <button
                    aria-label="GIFs"
                    className="swf-chat-gif-trigger"
                    title="GIFs"
                    type="button"
                >
                    GIF
                </button>
            </Popover.Trigger>

            <Popover.Portal>
                <Popover.Content
                    align="end"
                    className="swf-chat-gif-popover"
                    side="top"
                    sideOffset={8}
                >
                    <div className="swf-chat-gif-header">
                        <strong>GIFs</strong>

                        <form onSubmit={submitSearch}>
                            <input
                                aria-label="Search GIFs"
                                autoComplete="off"
                                maxLength={80}
                                placeholder="Search GIFs"
                                type="search"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                            />
                        </form>
                    </div>

                    <div className="swf-chat-gif-results">
                        {!apiKey && (
                            <div className="swf-chat-gif-status">
                                GIPHY API key is missing.
                            </div>
                        )}

                        {apiKey && loading && !results.length && (
                            <div className="swf-chat-gif-status">
                                Loading GIFs...
                            </div>
                        )}

                        {apiKey && !loading && !!error && (
                            <div className="swf-chat-gif-status">
                                {error}
                            </div>
                        )}

                        {apiKey && !loading && !error && !results.length && (
                            <div className="swf-chat-gif-status">
                                No GIFs found.
                            </div>
                        )}

                        {results.map((gif) => {
                            const preview = getPreviewUrl(gif);

                            return (
                                <button
                                    className="swf-chat-gif-result"
                                    key={gif.id}
                                    title={gif.title || 'Send GIF'}
                                    type="button"
                                    onClick={() => selectGif(gif)}
                                >
                                    <img
                                        alt={gif.title || ''}
                                        draggable={false}
                                        loading="lazy"
                                        src={preview}
                                    />
                                </button>
                            );
                        })}
                    </div>

                    <div className="swf-chat-gif-attribution">
                        Powered By GIPHY
                    </div>

                    <Popover.Arrow className="swf-chat-gif-arrow" />
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
};
