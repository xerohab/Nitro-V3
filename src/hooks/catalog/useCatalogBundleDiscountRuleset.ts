import { BundleDiscountRuleset, BundleDiscountRulesetMessageEvent, GetBundleDiscountRulesetComposer } from '@nitrots/nitro-renderer';
import { UseQueryResult } from '@tanstack/react-query';
import { useNitroQuery } from '../../api/nitro-query';

export const useCatalogBundleDiscountRuleset = (options: { enabled?: boolean } = {}): UseQueryResult<BundleDiscountRuleset> =>
    useNitroQuery<BundleDiscountRulesetMessageEvent, BundleDiscountRuleset>({
        key: ['nitro', 'catalog', 'bundleDiscountRuleset'],
        request: () => new GetBundleDiscountRulesetComposer(),
        parser: BundleDiscountRulesetMessageEvent,
        select: (event) => event.getParser().bundleDiscountRuleset,
        enabled: options.enabled,
        staleTime: Infinity
    });
