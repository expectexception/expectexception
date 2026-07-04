import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Centralised scroll behaviour for SPA navigation.
 *
 * React Router (BrowserRouter) does NOT restore scroll on its own, so every
 * route change previously kept the *previous* page's scroll offset — which is
 * why moving to the "next step" / a new tool left you halfway down the page.
 *
 * Behaviour:
 *   - PUSH / REPLACE (a new page, clicking "next", opening a tool): jump to the
 *     top so the new content starts at the top. If the URL has a #hash anchor,
 *     scroll that element into view instead.
 *   - POP (browser Back / Forward): restore the scroll offset the user had on
 *     that history entry, so Back feels natural instead of dumping them at top.
 *
 * Because <AnimatePresence mode="wait"> delays the incoming page by the ~300ms
 * exit animation, restoration on POP is retried across a few frames until the
 * document is tall enough for the saved offset to actually apply.
 */

const scrollPositions = new Map<string, number>();

const ScrollManager: React.FC = () => {
    const location = useLocation();
    const navType = useNavigationType(); // 'POP' | 'PUSH' | 'REPLACE'
    const currentKey = useRef<string>(location.key);

    // Take over scroll restoration from the browser so it doesn't fight us.
    useEffect(() => {
        if ('scrollRestoration' in window.history) {
            const prev = window.history.scrollRestoration;
            window.history.scrollRestoration = 'manual';
            return () => {
                window.history.scrollRestoration = prev;
            };
        }
    }, []);

    // Continuously remember where the user is on the *current* history entry,
    // so we can put them back there when they hit Back.
    useEffect(() => {
        currentKey.current = location.key;
        const save = () => scrollPositions.set(currentKey.current, window.scrollY);
        window.addEventListener('scroll', save, { passive: true });
        return () => {
            window.removeEventListener('scroll', save);
            // Persist the final position for this entry as we leave it.
            scrollPositions.set(currentKey.current, window.scrollY);
        };
    }, [location.key]);

    useEffect(() => {
        // Anchor links (e.g. /page#section) take priority over top/restore.
        if (location.hash) {
            const el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
            if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
                return;
            }
        }

        if (navType === 'POP') {
            const target = scrollPositions.get(location.key) ?? 0;
            // Incoming page mounts after the exit animation; retry a handful of
            // frames until the layout is tall enough to honour the offset.
            // behavior:'auto' overrides the global `scroll-behavior: smooth`
            // (index.css) so the jump is instant and the retry check is valid.
            let frames = 0;
            const restore = () => {
                window.scrollTo({ top: target, left: 0, behavior: 'instant' as ScrollBehavior });
                if (Math.abs(window.scrollY - target) > 2 && frames < 20) {
                    frames += 1;
                    requestAnimationFrame(restore);
                }
            };
            requestAnimationFrame(restore);
        } else {
            // New page / next step → start at the top. 'auto' does NOT mean
            // instant — per the ScrollToOptions spec it means "defer to the
            // scroll-behavior CSS property", and index.css sets that to
            // smooth globally. That silently turned every "scroll to top"
            // into a multi-second glide (worse the taller the previous page
            // was), which is what made navigation look like it dumped you
            // near the footer instead of the top. 'instant' bypasses CSS
            // and actually jumps immediately.
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
        }
    }, [location.key, location.hash, navType]);

    return null;
};

export default ScrollManager;
