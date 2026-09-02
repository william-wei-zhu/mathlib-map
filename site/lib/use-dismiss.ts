"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Close a popover on an outside pointer press or the Escape key. Uses `pointerdown` (not `mousedown`)
 * so touch dismissals work, and only binds the listeners while the popover is open. The latest
 * `onClose` is held in a ref, so callers can pass an inline function without re-subscribing.
 */
export function useDismiss(ref: RefObject<HTMLElement | null>, open: boolean, onClose: () => void) {
  const cb = useRef(onClose);
  useEffect(() => {
    cb.current = onClose;
  });
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) cb.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cb.current();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [ref, open]);
}
