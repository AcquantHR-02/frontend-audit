"use client";

import { useCountUp } from "@/hooks/use-motion";
import { formatCount } from "@/lib/utils";

/**
 * Number that counts up on mount and when it changes. Screen readers get the final value
 * (the animated digits are aria-hidden), so nothing is announced mid-count.
 */
export function AnimatedNumber({
  value,
  decimals = 0,
  suffix = "",
  className,
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  className?: string;
}) {
  const shown = useCountUp(value);
  const format = (n: number) =>
    decimals ? `${n.toFixed(decimals)}${suffix}` : `${formatCount(Math.round(n))}${suffix}`;
  return (
    <span className={className}>
      <span aria-hidden>{format(shown)}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}
