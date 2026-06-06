"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

/**
 * Container that cascades its <StaggerItem> children in sequence.
 * `trigger="mount"` fires on first paint (use above the fold, e.g. the hero);
 * `trigger="inView"` waits until scrolled into view (default).
 */
export function Stagger({
  children,
  className,
  trigger = "inView",
  stagger = 0.08,
  delayChildren = 0.04,
}: {
  children: ReactNode;
  className?: string;
  trigger?: "mount" | "inView";
  stagger?: number;
  delayChildren?: number;
}) {
  const container = {
    hidden: {},
    show: { transition: { staggerChildren: stagger, delayChildren } },
  };
  const trig =
    trigger === "mount"
      ? ({ initial: "hidden", animate: "show" } as const)
      : ({
          initial: "hidden",
          whileInView: "show",
          viewport: { once: true, margin: "-80px" },
        } as const);

  return (
    <motion.div className={className} variants={container} {...trig}>
      {children}
    </motion.div>
  );
}

/**
 * A single cascaded child. Pass `hover` to add a springy lift on pointer hover.
 */
export function StaggerItem({
  children,
  className,
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <motion.div
      variants={itemVariants}
      whileHover={hover ? { y: -4 } : undefined}
      transition={hover ? { type: "spring", stiffness: 320, damping: 22 } : undefined}
      className={className}
    >
      {children}
    </motion.div>
  );
}
