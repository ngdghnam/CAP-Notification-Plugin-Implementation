/**
 * Column definitions for the Items worklist table.
 *
 * Pattern (Conarum @cnma/react-ui DataTableColumn):
 *   - key: maps to entity field name
 *   - labelKey: column label (i18n key or string)
 *   - renderType: 'text' | 'link' | 'badge' | 'status' | 'date' | 'number' | 'duration' | 'custom'
 *   - render: optional custom renderer
 *
 * ★ Replace "Items" with your actual entity name.
 *   Import and pass to your DataTable component as `columns`.
 */
import type { DataTableColumn } from '@cnma/react-ui';

// ── Entity type — replace with your actual entity interface ───────────────────
export interface Item {
    ID: string;
    name: string;
    description?: string;
    status: string;
    priority: number;
    createdAt?: string;
    modifiedAt?: string;
}

// ── Column definitions ────────────────────────────────────────────────────────
export const itemsColumns: DataTableColumn<Item>[] = [
    {
        key: 'name',
        labelKey: 'Name',
        renderType: 'custom',
        render: (name: any) => (
            <span className="font-medium text-foreground">{String(name || '')}</span>
        ),
    },
    {
        key: 'status',
        labelKey: 'Status',
        renderType: 'custom',
        render: (status: any) => {
            const displayStatus = String(status || '');
            return (
                <span className={`
                    inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                    ${displayStatus === 'active' ? 'bg-status-done text-status-done-foreground' : ''}
                    ${displayStatus === 'pending' ? 'bg-status-pending text-status-pending-foreground' : ''}
                    ${displayStatus === 'inactive' ? 'bg-status-cancelled text-status-cancelled-foreground' : ''}
                `}>
                    {displayStatus}
                </span>
            );
        },
    },
    {
        key: 'priority',
        labelKey: 'Priority',
    },
    {
        key: 'description',
        labelKey: 'Description',
        renderType: 'custom',
        render: (description: any) => (
            <span className="text-muted-foreground truncate max-w-xs block">{String(description || '-')}</span>
        ),
    },
];

