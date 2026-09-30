import type { IWiredVariableHolder } from '@octane/renderer';
import { useEffect, useRef, useState } from 'react';
import {
    EXPLORER_SORT_OPTIONS,
    explorerErrorMessage,
    sortOptionById,
    targetKindsOf,
    VariablesWebApiClient,
    WebApiHolderScope,
    WebApiTargetKind,
    webApiEntryToHolder
} from '../../api';
import { calculateLastPage, NO_PAGE } from '../../components/wired-tools/WiredPaging.helpers';
import { useWiredPageRequests } from '../wired-tools/useWiredPageRequests';

export const VARIABLES_EXPLORER_PAGE_SIZE = 50;
/** Keeps paging well under the API's 60 requests per 10 s per key. */
const REQUEST_PAGE_RATELIMIT = 400;

interface HoldersPage {
    page: number;
    total: number;
    holders: IWiredVariableHolder[];
}

/** One page at a time of who holds a variable, read over the Variables Web API. */
export const useVariablesExplorerHolders = (client: VariablesWebApiClient, scope: WebApiHolderScope, name: string) => {
    const [targetKind, setTargetKind] = useState<WebApiTargetKind>(targetKindsOf(scope)[0]);
    const [sortId, setSortId] = useState(EXPLORER_SORT_OPTIONS[0].id);
    const [page, setPage] = useState<HoldersPage | null>(null);
    const [scrollKey, setScrollKey] = useState(0);
    const [status, setStatus] = useState('');
    const requestId = useRef(0);

    const load = async (requested: number, kind: WebApiTargetKind, sort: string) => {
        const id = ++requestId.current;
        const option = sortOptionById(sort);

        try {
            const result = await client.listEntries(scope, name, kind, requested, VARIABLES_EXPLORER_PAGE_SIZE, option.sort, option.order);

            if (id !== requestId.current) return;

            setPage({
                page: result?.page ?? requested,
                total: result?.total ?? 0,
                holders: (result?.entries ?? []).map((entry) => webApiEntryToHolder(entry, scope, kind))
            });
            setScrollKey((key) => key + 1);
            setStatus('');
        } catch (error) {
            if (id !== requestId.current) return;

            setStatus(explorerErrorMessage(error));
        }
    };

    useEffect(() => {
        const kind = targetKindsOf(scope)[0];

        setTargetKind(kind);
        setSortId(EXPLORER_SORT_OPTIONS[0].id);
        setPage(null);
        void load(1, kind, EXPLORER_SORT_OPTIONS[0].id);
    }, [client, scope, name]);

    const currentPage = page?.page ?? NO_PAGE;
    const lastPage = page ? calculateLastPage(page.total, VARIABLES_EXPLORER_PAGE_SIZE) : NO_PAGE;

    const requests = useWiredPageRequests({
        currentPage,
        lastPage,
        pageKey: page,
        ratelimit: REQUEST_PAGE_RATELIMIT,
        onRequestPage: (requested) => void load(requested, targetKind, sortId)
    });

    const changeFilters = (kind: WebApiTargetKind, sort: string) => {
        if (!requests.canRequestNewPage(false)) return;

        setTargetKind(kind);
        setSortId(sort);
        void load(1, kind, sort);
    };

    return { targetKind, sortId, page, currentPage, lastPage, scrollKey, status, setStatus, requests, changeFilters };
};
