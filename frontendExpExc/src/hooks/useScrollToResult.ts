import { useEffect, useRef } from 'react';

/**
 * Scrolls an element into view the moment a multi-step flow advances to it —
 * e.g. when a tool finishes processing and the result block appears far below
 * the "Convert" button, or a wizard moves to its next step.
 *
 * Returns a ref to attach to the element that should be revealed. It only fires
 * on a false→true (or changed-truthy) transition of `active`, so re-renders
 * while the result is already visible don't yank the page around.
 *
 * Usage:
 *   const resultRef = useScrollToResult(!!result);
 *   ...
 *   {result && <Box ref={resultRef}>...</Box>}
 */
export function useScrollToResult<T extends HTMLElement = HTMLDivElement>(
    active: unknown,
): React.RefObject<T> {
    const ref = useRef<T>(null);
    const prev = useRef<unknown>(active);

    useEffect(() => {
        const became = !prev.current && !!active;
        const changed = prev.current !== active && !!active;
        prev.current = active;
        if (!(became || changed)) return;

        // Wait a frame so the element is in the DOM and laid out.
        const id = requestAnimationFrame(() => {
            ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        return () => cancelAnimationFrame(id);
    }, [active]);

    return ref;
}
