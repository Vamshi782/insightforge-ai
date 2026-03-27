"use client";

import Link from "next/link";
import { BarChart2, Moon, Sun, Zap } from "lucide-react";
import { useDarkMode } from "@/hooks/useDarkMode";

const NAV_LINKS = [
  { label: "Docs", href: "https://nextjs.org/docs" },
  { label: "Pricing", href: "#pricing" },
  { label: "GitHub", href: "https://github.com/vamshi-krishna-korutla" },
];

export default function Navbar() {
  const { dark, toggle } = useDarkMode();

  return (
    <header className="border-b border-stroke bg-surface sticky top-0 z-50 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center shadow-sm shadow-accent/30">
            <BarChart2 className="w-4.5 h-4.5 text-accent-fg" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold text-base text-fg tracking-tight">
              InsightForge
            </span>
            <span className="font-bold text-base text-accent tracking-tight">
              AI
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1 bg-accent/10 text-accent text-[10px] font-semibold px-1.5 py-0.5 rounded-full border border-accent/20">
            <Zap className="w-2.5 h-2.5" />
            BETA
          </div>
        </div>

        {/* Nav */}
        <nav className="flex items-center gap-5 text-sm text-muted">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="hidden sm:block hover:text-fg transition-colors"
            >
              {link.label}
            </Link>
          ))}

          <button
            onClick={toggle}
            aria-label="Toggle dark mode"
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-stroke hover:bg-surface2 transition-colors"
          >
            {dark ? (
              <Sun className="w-4 h-4 text-accent" />
            ) : (
              <Moon className="w-4 h-4 text-muted" />
            )}
          </button>
        </nav>
      </div>
    </header>
  );
}
