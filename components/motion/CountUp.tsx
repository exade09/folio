"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "motion/react";
import { ease } from "@/lib/motion";
import { isHydrated, prefersReducedMotion } from "./hydration";

/**
 * A number that runs up to its value the first time it comes into view.
 *
 * Mounted after hydration (a list that appears once a wallet is scanned), it
 * starts at zero, so there is no frame showing the final figure before the
 * count. Mounted during hydration, it renders the server's figure first, as
 * hydration requires. Screen readers get the final value from the label
 * either way and never hear it counting.
 */
export function CountUp({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  signed = false,
  duration = 1.1,
  delay = 0,
  className = "",
  format,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  signed?: boolean;
  duration?: number;
  delay?: number;
  className?: string;
  format?: (n: number) => string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [shown, setShown] = useState<number>(() =>
    isHydrated() && !prefersReducedMotion() ? 0 : value
  );

  useEffect(() => {
    if (!inView || prefersReducedMotion()) return;
    const controls = animate(0, value, {
      duration,
      delay,
      ease: ease.settle,
      onUpdate: (v) => setShown(v),
    });
    return () => controls.stop();
  }, [inView, value, duration, delay]);

  const render = (n: number) =>
    format
      ? format(n)
      : n.toLocaleString("en-US", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        });
  const sign = signed && value > 0 ? "+" : "";

  return (
    <span ref={ref} className={`tabular-nums ${className}`} aria-label={`${sign}${prefix}${render(value)}${suffix}`}>
      <span aria-hidden="true">
        {sign}
        {prefix}
        {render(shown)}
        {suffix}
      </span>
    </span>
  );
}
