import { FC } from 'react';
import { CreateLinkEvent } from '@octane/renderer';

export const UI2CatalogLauncher: FC = () => (
    <button
        type="button"
        className="solace-ui2-launcher solace-ui2-catalog-launcher"
        aria-label="Catalogue"
        title="Catalogue"
        onClick={() => CreateLinkEvent('catalog/toggle/normal')}
    >
        <span className="octane-icon icon-catalog" />
        <span>Catalogue</span>
    </button>
);
