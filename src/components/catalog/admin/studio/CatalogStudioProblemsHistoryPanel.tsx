import { FC, useState } from 'react';
import { FaExclamationTriangle, FaHistory, FaUndo } from 'react-icons/fa';
import { CatalogStudioHistoryGroup, CatalogStudioValidationIssue } from './CatalogStudioTypes';

interface CatalogStudioProblemsHistoryPanelProps {
    issues: CatalogStudioValidationIssue[];
    history: CatalogStudioHistoryGroup[];
    loading: boolean;
    undo: (groupId: number) => void;
}

export const CatalogStudioProblemsHistoryPanel: FC<CatalogStudioProblemsHistoryPanelProps> = ({ issues, history, loading, undo }) => {
    const [undoCandidate, setUndoCandidate] = useState<CatalogStudioHistoryGroup | null>(null);

    const undoNow = () => {
        if (!undoCandidate) return;
        const groupId = undoCandidate.id;
        setUndoCandidate(null);
        undo(groupId);
    };

    return <div className="nitro-catalog-admin-publish">
        <div className="nitro-catalog-admin-validation-list">
            <div className="nitro-catalog-admin-publish-changes-head">Current catalog problems</div>
            {!issues.length && <div className="nitro-catalog-admin-placeholder is-small">No structural problems found.</div>}
            {issues.map((issue, index) => <div
                key={`${issue.code}-${issue.entityType}-${issue.entityId}-${issue.field}-${index}`}
                className="nitro-catalog-admin-validation-row"
            >
                <FaExclamationTriangle />
                <div>
                    <strong>{issue.message}</strong>
                    <span>{issue.entityType} #{issue.entityId} &middot; {issue.field}</span>
                </div>
            </div>)}
        </div>

        <div className="nitro-catalog-admin-publish-changes">
            <div className="nitro-catalog-admin-publish-changes-head"><FaHistory /> Live operation history</div>
            {!history.length && <div className="nitro-catalog-admin-placeholder is-small">No recorded operations.</div>}
            {history.map(group => <div key={group.id} className="nitro-catalog-admin-history-row">
                <div className="nitro-catalog-admin-history-main">
                    <strong>{group.summary}</strong>
                    <span>{group.entries.length} affected item(s) &middot; {group.actorName || `User #${group.actorId}`}</span>
                </div>
                <button
                    className="nitro-catalog-admin-btn is-small"
                    disabled={loading}
                    aria-label={`Undo ${group.summary}`}
                    onClick={() => setUndoCandidate(group)}
                >
                    <FaUndo /> Undo
                </button>
            </div>)}
        </div>

        {undoCandidate && <div className="nitro-catalog-admin-publish-confirmation" role="dialog" aria-modal="true" aria-label="Confirm operation undo">
            <FaUndo />
            <div>
                <strong>Undo &ldquo;{undoCandidate.summary}&rdquo;?</strong>
                <span>The complete live operation will be reversed and recorded in history.</span>
            </div>
            <div className="nitro-catalog-admin-publish-actions">
                <button className="nitro-catalog-admin-btn" onClick={() => setUndoCandidate(null)}>Cancel</button>
                <button className="nitro-catalog-admin-btn is-publish" onClick={undoNow}>Undo operation</button>
            </div>
        </div>}
    </div>;
};
