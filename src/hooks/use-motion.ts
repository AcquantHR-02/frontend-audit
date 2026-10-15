"use client";

import { useEffect, useRef, useState } from "react";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * False on the first paint, true one frame later: bars and arcs render at 0 and then
 * transition to their real size, so charts "grow in". Always true for reduced motion.
 */
export function useGrowIn() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return ready || prefersReducedMotion();
}

/** Counts from 0 (or the previous value) up to `value` with an ease-out curve. */
export function useCountUp(value: number, duration = 900) {
  const [shown, setShown] = useState(0);
  const current = useRef(0);
  const reduced = prefersReducedMotion();
  useEffect(() => {
    if (reduced) return;
    const from = current.current;
    const start = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const next = from + (value - from) * (1 - Math.pow(1 - t, 3));
      current.current = next;
      setShown(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [value, duration, reduced]);
  return reduced ? value : shown;
}
