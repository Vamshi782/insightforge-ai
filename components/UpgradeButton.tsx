"use client";

import { Crown } from "lucide-react";

export default function UpgradeButton() {
  return (
    <button
      className="w-full bg-accent text-accent-fg px-4 py-3 rounded-xl font-semibold text-sm hover:bg-accent-hover transition-colors shadow-md shadow-accent/20"
      onClick={() => alert("Pro plan coming soon! We'll notify you when it launches.")}
    >
      <span className="flex items-center justify-center gap-2">
        <Crown className="w-4 h-4" />
        Upgrade to Pro
      </span>
    </button>
  );
}
