import { FC } from 'react';
import { CreateLinkEvent } from '@octane/renderer';

export const UI2InventoryLauncher: FC = () => (
    <button
        type="button"
        className="solace-ui2-launcher solace-ui2-inventory-launcher"
        aria-label="Inventory"
        title="Inventory"
        onClick={() => CreateLinkEvent('inventory/toggle')}
    >
        <span className="octane-icon icon-inventory" />
        <span>Inventory</span>
    </button>
);
