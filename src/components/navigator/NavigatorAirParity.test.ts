import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relative: string) => readFileSync(join(process.cwd(), relative), 'utf8');

describe('AIR navigator visual contract', () => {
    it('opts the shell into Ubuntu frame style 3 with 425/578 widths and native action bitmaps', () => {
        const view = read('src/components/navigator/NavigatorView.tsx');
        const css = read('src/css/navigator/NavigatorView.css');

        expect(view).toContain('nitro-navigator-air__skin');
        expect(view).toContain('nitro-navigator-air__close');
        expect(view).toContain('nitro-navigator-air__quick-toggle');
        expect(css).toContain('frame-ubuntu-3.png');
        expect(css).toContain('close-3-hover.png');
        expect(css).toContain('tab-3-default-left.png');
        expect(css).toContain('tab-3-selected-mid.png');
        expect(view).toContain('ForwardToSomeRoomMessageComposer');
        expect(view).toContain('create-room.png');
        expect(view).toContain('promote-room.png');
        expect(view).toContain('nitro-navigator-air__action-border');
        expect(css).toContain('border-4.png');
        expect(css).toContain('border-5.png');
        expect(css).toContain('color: #ffffff !important');
        expect(view).not.toContain('FindNewFriendsMessageComposer');
        expect(css).toContain('width: 425px');
        expect(css).toContain('width: 578px');
        expect(css).toContain('width: 88px');
        expect(css).toContain('width: 383px');
        expect(css).toContain('height: 20px');
        expect(css).toContain('width: 122px');
        expect(css).toContain('height: 146px');
        expect(css).toContain('width: 189px');
        expect(css).toContain('height: 60px');
        expect(css).toContain('left: 205px');
        expect(css).toContain('width: 187px');
        expect(css).not.toContain('object-fit: fill');
        expect(css).toContain('width: 374px');
        expect(css).toContain('bubble-7.png');
        expect(css).toContain('bubble-pointer-left.png');
    });

    it('searches only on explicit submit rather than a live debounce', () => {
        const search = read('src/components/navigator/views/search/NavigatorSearchView.tsx');

        expect(search).toContain('onSubmit');
        expect(search).not.toContain('300');
        expect(search).not.toContain('setTimeout');
    });

    it('uses an AIR dropmenu instead of a native select for search filters', () => {
        const filter = read('src/components/navigator/views/search/NavigatorFilterChipsView.tsx');
        const css = read('src/css/navigator/NavigatorView.css');

        expect(filter).not.toContain('<select');
        expect(filter).toContain('nitro-navigator-air__filter-list');
        expect(css).toContain('dropmenu-3.png');
        expect(css).toContain('nitro-navigator-air__tab-shelf');
        expect(css).toContain('close-3-default.png');
    });
});
