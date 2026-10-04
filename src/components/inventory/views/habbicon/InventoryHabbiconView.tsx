import { HabbiconAssetManager, TriggerHabbiconComposer } from '@octane/renderer';
import { FC, useEffect } from 'react';
import { SendMessageComposer, useHabbiconCatalog } from '../../../../api';

export const InventoryHabbiconView: FC = () => {
    const catalog = useHabbiconCatalog();

    useEffect(() => {
        if (!catalog.enabled || !catalog.baseUrl) return;

        void HabbiconAssetManager.getInstance().preload();
    }, [catalog.enabled, catalog.baseUrl]);

    if (!catalog.enabled) {
        return (
            <div className="octane-inventory-habbicons-empty">
                Habbicons are currently unavailable.
            </div>
        );
    }

    if (!catalog.loaded) {
        return (
            <div className="octane-inventory-habbicons-empty">
                Loading Habbicons...
            </div>
        );
    }

    const ownedEntries = catalog.ownedEntries || [];

    if (!ownedEntries.length) {
        return (
            <div className="octane-inventory-habbicons-empty">
                You do not own any Habbicons yet.
            </div>
        );
    }

    const assetManager = HabbiconAssetManager.getInstance();

    const useHabbicon = (id: number) => {
        SendMessageComposer(new TriggerHabbiconComposer(id));
        catalog.clearUnseen(id);
    };

    return (
        <div className="octane-inventory-habbicons">
            {ownedEntries.map((entry) => {
                const previewUrl = assetManager.getPreviewUrl(entry.id);

                return (
                    <button
                        key={entry.id}
                        type="button"
                        className={`octane-inventory-habbicon ${entry.favorite ? 'is-favourite' : ''}`}
                        title={entry.nameKey || `Habbicon ${entry.id}`}
                        onClick={() => useHabbicon(entry.id)}
                    >
                        {previewUrl ? (
                            <img
                                src={previewUrl}
                                alt=""
                                draggable={false}
                            />
                        ) : (
                            <span className="octane-inventory-habbicon-placeholder">
                                {entry.id}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
};
