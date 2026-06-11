"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

// Ordered to match the section order on the landing page.
const NAV_LINKS = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#architecture", label: "Architecture" },
  { href: "/#why-walrus", label: "Why Walrus" },
  { href: "/#compare", label: "Compare" },
  { href: "/developers", label: "Developers" },
  { href: "/#demo", label: "Demo" },
];

const GITHUB_URL = "https://github.com/The16bitninja/SuiTrace";

function BrandMark() {
  return (
    <span className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-sky-400 to-cyan-300 text-sm font-bold text-zinc-950 shadow-[0_0_18px_-4px_rgba(56,189,248,0.6)]">
      S
    </span>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-50 border-b border-white/10 bg-[#08080b]/70 backdrop-blur-xl"
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <Link href="/" className="group flex items-center gap-2">
          <BrandMark />
          <span className="text-lg font-bold tracking-tight text-zinc-100">
            SuiTrace
          </span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="group relative text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-100"
            >
              {l.label}
              <span className="absolute -bottom-1 left-0 h-px w-0 bg-gradient-to-r from-sky-400 to-cyan-300 transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-200"
          >
            GitHub
          </a>
        </div>

        <button
          onClick={() => setOpen((o) => !o)}
          className="md:hidden"
          aria-label="Toggle menu"
        >
          <div className="space-y-1.5">
            <span className="block h-0.5 w-6 bg-zinc-200" />
            <span className="block h-0.5 w-6 bg-zinc-200" />
            <span className="block h-0.5 w-6 bg-zinc-200" />
          </div>
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden border-t border-white/10 bg-[#08080b] md:hidden"
          >
            <div className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-3">
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-2 py-2 text-sm font-medium text-zinc-300 hover:bg-white/5"
                >
                  {l.label}
                </Link>
              ))}
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md px-2 py-2 text-sm font-medium text-sky-400"
              >
                GitHub ↗
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
