"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Counts from 0 up to `to` once the element enters the viewport. Honors the
 * user's reduced-motion setting by snapping straight to the final value.
 */
export default function CountUp({
  to,
  duration = 1.2,
  prefix = "",
  suffix = "",
  className,
}: {
  to: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduced = useReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    // Reduced-motion: a zero-duration animation snaps to `to` via the same
    // async callback path (no synchronous setState inside the effect body).
    const controls = animate(0, to, {
      duration: reduced ? 0 : duration,
      ease: EASE,
      onUpdate: (v) => setValue(Math.round(v)),
      onComplete: () => setValue(to),
    });
    return () => controls.stop();
  }, [inView, to, duration, reduced]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {value}
      {suffix}
    </span>
  );
}
