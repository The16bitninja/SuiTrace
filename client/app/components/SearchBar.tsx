"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SearchBar({
  size = "md",
}: {
  size?: "md" | "lg";
}) {
  const [address, setAddress] = useState("");
  const router = useRouter();

  const go = () => {
    const a = address.trim();
    if (a) router.push(`/${a}`);
  };

  const input =
    size === "lg" ? "px-5 py-3.5 text-base" : "px-4 py-2.5 text-sm";
  const button =
    size === "lg" ? "px-6 py-3.5 text-base" : "px-5 py-2.5 text-sm";

  return (
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
  );
}
