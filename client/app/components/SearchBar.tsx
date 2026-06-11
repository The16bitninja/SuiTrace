"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// A plausible Sui address: 0x followed by 1 to 64 hex chars. Lenient on length
// so partial pastes still resolve; the page handles anything with no records.
const ADDRESS_RE = /^0x[0-9a-fA-F]{1,64}$/;

export default function SearchBar({
  size = "md",
}: {
  size?: "md" | "lg";
}) {
  const [address, setAddress] = useState("");
  const [debounced, setDebounced] = useState("");
  const router = useRouter();

  // Debounce the input so validity feedback settles after typing pauses
  // instead of recomputing on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(address.trim()), 250);
    return () => clearTimeout(t);
  }, [address]);

  const isValid = ADDRESS_RE.test(debounced);

  const go = () => {
    const a = address.trim();
    if (!ADDRESS_RE.test(a)) {
      setDebounced(a); // surface the hint right away instead of navigating
      return;
    }
    router.push(`/${a}`);
  };

  const input =
    size === "lg" ? "px-5 py-3.5 text-base" : "px-4 py-2.5 text-sm";
  const button =
    size === "lg" ? "px-6 py-3.5 text-base" : "px-5 py-2.5 text-sm";

  return (
    <div className="w-full">
      <div className="flex w-full gap-2">
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && go()}
          placeholder="0x… agent address"
          className={`flex-1 rounded-lg border border-white/10 bg-white/[0.03] font-mono ${input} text-zinc-100 placeholder:text-zinc-600 shadow-sm transition-colors focus:border-sky-400/60 focus:outline-none focus:ring-2 focus:ring-sky-400/15`}
        />
        <button
          onClick={go}
          className={`rounded-lg bg-white font-medium text-zinc-950 shadow-sm transition-colors hover:bg-zinc-200 ${button}`}
        >
          Inspect
        </button>
      </div>
      {debounced && !isValid && (
        <p className="mt-1.5 text-xs text-zinc-500">
          Expected a 0x… hex agent address.
        </p>
      )}
    </div>
  );
}
