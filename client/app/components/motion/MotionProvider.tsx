"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/**
 * App-wide motion settings. `reducedMotion="user"` makes every animation in the
 * tree honor the OS "reduce motion" setting automatically: transforms are
 * skipped, only opacity cross-fades remain. Rendered once in the root layout.
 */
export default function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
