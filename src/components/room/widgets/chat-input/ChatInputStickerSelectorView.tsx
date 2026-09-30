import { UseStickerComposer } from '@octane/renderer';
import * as Popover from '@radix-ui/react-popover';
import { FC, useEffect, useMemo, useState } from 'react';
import { GetConfigurationValue, SendMessageComposer } from '../../../../api';

interface StickerEntry
{
    id: number;
    name: string;
    category: string;
    image: string;
}

interface StickerCatalog
{
    stickers?: StickerEntry[];
}

const VALID_IMAGE = /^[A-Za-z0-9_./-]+\.(?:png|webp|gif|svg)$/i;

const normalizeRoot = (value: string): string =>
{
    let root = `${ value || '/client/stickers/' }`;

    if(!root.endsWith('/')) root += '/';

    return root;
};

export const ChatInputStickerSelectorView: FC = () =>
{
    const [selectorVisible, setSelectorVisible] = useState(false);
    const [stickers, setStickers] = useState<StickerEntry[]>([]);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('All');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const enabled = GetConfigurationValue<boolean>('stickers.enabled', true);
    const assetRoot = normalizeRoot(
        GetConfigurationValue<string>('stickers.asset.root', '/client/stickers/')
    );
    const assetHash = `${ GetConfigurationValue<string>('stickers.asset.hash', 'default') || '' }`
        .replace(/^\/+|\/+$/g, '');

    const baseUrl = assetHash
        ? `${ assetRoot }${ assetHash }/`
        : assetRoot;

    useEffect(() =>
    {
        if(!enabled) return;

        let cancelled = false;

        const load = async () =>
        {
            setLoading(true);
            setError('');

            try
            {
                const response = await fetch(`${ baseUrl }stickers.json`, {
                    credentials: 'omit',
                    cache: 'no-store'
                });

                if(!response.ok)
                {
                    throw new Error(`Sticker catalog returned HTTP ${ response.status }`);
                }

                const payload = (await response.json()) as StickerCatalog;
                const source = Array.isArray(payload?.stickers) ? payload.stickers : [];

                const valid = source.filter((entry) =>
                {
                    if(!entry) return false;

                    const id = Number(entry.id);
                    const image = `${ entry.image || '' }`.trim();

                    if(!Number.isInteger(id) || id <= 0 || id > 1000000) return false;
                    if(!`${ entry.name || '' }`.trim()) return false;
                    if(!image || !VALID_IMAGE.test(image)) return false;
                    if(image.startsWith('/') || image.includes('..') || image.includes('://')) return false;

                    return true;
                });

                if(cancelled) return;

                setStickers(valid);
            }
            catch(err)
            {
                if(cancelled) return;

                console.warn('[Stickers] Failed to load catalog:', err);
                setStickers([]);
                setError('Unable to load stickers.');
            }
            finally
            {
                if(!cancelled) setLoading(false);
            }
        };

        void load();

        return () =>
        {
            cancelled = true;
        };
    }, [enabled, baseUrl]);

    const categories = useMemo(() =>
    {
        const values = Array.from(
            new Set(
                stickers
                    .map((sticker) => `${ sticker.category || 'General' }`.trim())
                    .filter(Boolean)
            )
        );

        return ['All', ...values];
    }, [stickers]);

    const visibleStickers = useMemo(() =>
    {
        const query = search.trim().toLowerCase();

        return stickers.filter((sticker) =>
        {
            if(category !== 'All' && sticker.category !== category) return false;

            if(!query) return true;

            return (
                sticker.name.toLowerCase().includes(query) ||
                sticker.category.toLowerCase().includes(query) ||
                sticker.id.toString().includes(query)
            );
        });
    }, [stickers, search, category]);

    const sendSticker = (sticker: StickerEntry) =>
    {
        if(!Number.isInteger(sticker.id) || sticker.id <= 0) return;

        SendMessageComposer(new UseStickerComposer(sticker.id));
        setSelectorVisible(false);
    };

    if(!enabled) return null;

    return (
        <Popover.Root
            open={selectorVisible}
            onOpenChange={(open) =>
            {
                setSelectorVisible(open);

                if(!open)
                {
                    setSearch('');
                    setCategory('All');
                }
            }}
        >
            <Popover.Trigger asChild>
                <button
                    aria-label="Stickers"
                    className="swf-chat-sticker-trigger"
                    title="Stickers"
                    type="button"
                >
                    <span className="swf-chat-sticker-trigger-icon">★</span>
                </button>
            </Popover.Trigger>

            <Popover.Portal>
                <Popover.Content
                    align="end"
                    className="swf-chat-sticker-popover"
                    side="top"
                    sideOffset={8}
                >
                    <div className="swf-chat-sticker-header">
                        <strong>Stickers</strong>

                        <input
                            aria-label="Search stickers"
                            autoComplete="off"
                            maxLength={40}
                            placeholder="Search"
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </div>

                    {categories.length > 1 && (
                        <div className="swf-chat-sticker-categories">
                            {categories.map((value) => (
                                <button
                                    className={category === value ? 'active' : ''}
                                    key={value}
                                    type="button"
                                    onClick={() => setCategory(value)}
                                >
                                    {value}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="swf-chat-sticker-grid">
                        {loading && !stickers.length && (
                            <div className="swf-chat-sticker-status">
                                Loading stickers...
                            </div>
                        )}

                        {!loading && !!error && (
                            <div className="swf-chat-sticker-status">
                                {error}
                            </div>
                        )}

                        {!loading && !error && !visibleStickers.length && (
                            <div className="swf-chat-sticker-status">
                                No stickers found.
                            </div>
                        )}

                        {visibleStickers.map((sticker) => (
                            <button
                                className="swf-chat-sticker-item"
                                key={sticker.id}
                                title={sticker.name}
                                type="button"
                                onClick={() => sendSticker(sticker)}
                            >
                                <img
                                    alt={sticker.name}
                                    draggable={false}
                                    src={`${ baseUrl }${ sticker.image }`}
                                />

                                <span>{sticker.name}</span>
                            </button>
                        ))}
                    </div>

                    <Popover.Arrow className="swf-chat-sticker-arrow" />
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
};
