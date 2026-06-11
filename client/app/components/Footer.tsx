import Link from "next/link";

const GITHUB_URL = "https://github.com/The16bitninja/SuiTrace";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-white/10 bg-white/[0.015]">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col justify-between gap-8 md:flex-row">
          <div className="max-w-sm">
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/suitrace-icon.svg"
                alt="SuiTrace logo"
                width={32}
                height={32}
                className="h-8 w-8 rounded-md"
              />
              <span className="text-lg font-bold tracking-tight text-zinc-100">
                SuiTrace
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              Verifiable episodic memory for AI agents. The same Walrus blobs
              that make an agent smarter make it independently auditable.
            </p>
          </div>

          <div className="flex gap-16">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Product
              </h4>
              <ul className="mt-3 space-y-2 text-sm text-zinc-400">
                <li><Link href="/#how-it-works" className="transition-colors hover:text-zinc-100">How it works</Link></li>
                <li><Link href="/#why-walrus" className="transition-colors hover:text-zinc-100">Why Walrus</Link></li>
                <li><Link href="/developers" className="transition-colors hover:text-zinc-100">Developers</Link></li>
                <li><Link href="/#demo" className="transition-colors hover:text-zinc-100">Live demo</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Built with
              </h4>
              <ul className="mt-3 space-y-2 text-sm text-zinc-400">
                <li>Move · Sui</li>
                <li>Walrus</li>
                <li>Next.js</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-6 text-sm text-zinc-500 sm:flex-row sm:items-center">
          <span>Built for Sui Overflow 2026, Walrus track.</span>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-zinc-400 transition-colors hover:text-zinc-100"
          >
            GitHub ↗
          </a>
        </div>
      </div>
    </footer>
  );
}
