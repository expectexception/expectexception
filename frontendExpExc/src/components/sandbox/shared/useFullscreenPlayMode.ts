import { useEffect } from 'react';
import { useTheme, useMediaQuery } from '@mui/material';

/** True on touch-first / narrow-viewport devices - the signal `GamePlayShell`
 * uses to switch a game page into the fixed fullscreen "play mode" layout. */
export const useIsPlayModeDevice = (): boolean => {
    const theme = useTheme();
    const isNarrow = useMediaQuery(theme.breakpoints.down('sm'));
    const isCoarsePointer = useMediaQuery('(pointer: coarse)');
    return isNarrow || isCoarsePointer;
};

/** Locks page scroll for as long as `active` is true. Play mode renders as a
 * fixed fullscreen overlay (via portal), so the page underneath must not
 * scroll or rubber-band while the user is dragging/swiping on the game. */
export const useLockBodyScroll = (active: boolean) => {
    useEffect(() => {
        if (!active) return;
        const previousOverflow = document.body.style.overflow;
        const previousOverscroll = document.body.style.overscrollBehavior;
        document.body.style.overflow = 'hidden';
        document.body.style.overscrollBehavior = 'none';
        return () => {
            document.body.style.overflow = previousOverflow;
            document.body.style.overscrollBehavior = previousOverscroll;
        };
    }, [active]);
};
