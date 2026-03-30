"use client";

import Link from "next/link";
import { useState } from "react";
import { BarChart2, Zap, Menu, X, Moon, Sun } from "lucide-react";
import { useDarkMode } from "@/hooks/useDarkMode";

const NAV_LINKS = [
  { label: "Features", href: "/#features" },
  { label: "Pricing",  href: "/pricing"   },
  { label: "Reviews",  href: "/#reviews"  },
  { label: "Docs",     href: "/docs"      },
];

export default function Navbar() {
  const { dark, toggle } = useDarkMode();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* 5-px gradient top strip */}
      <div
        className="h-[5px] w-full shrink-0"
        style={{
          background:
            "linear-gradient(to right, #ccccff 0%, #e7d04c 50%, #31fb78 100%)",
        }}
      />

      <header className="sticky top-0 z-50 border-b border-stroke/60 backdrop-blur-md bg-surface/80 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

          {/* ── Logo ── */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center shadow-sm shadow-accent/30">
              <BarChart2 className="w-4 h-4 text-accent-fg" />
            </div>
            <span className="font-bold text-base text-fg tracking-tight">
              InsightForge
              <span className="text-accent ml-0.5">AI</span>
            </span>
            <div className="hidden sm:flex items-center gap-1 bg-accent/10 text-accent text-[10px] font-semibold px-1.5 py-0.5 rounded-full border border-accent/20">
              <Zap className="w-2.5 h-2.5" />
              BETA
            </div>
          </Link>

          {/* ── Center nav (desktop) ── */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-muted hover:text-fg hover:bg-surface2 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* ── Right actions (desktop) ── */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <button
              onClick={toggle}
              aria-label="Toggle dark mode"
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-stroke hover:bg-surface2 transition-colors"
            >
              {dark
                ? <Sun  className="w-4 h-4 text-accent" />
                : <Moon className="w-4 h-4 text-muted"  />}
            </button>

            <Link
              href="/"
              className="text-sm font-medium text-fg hover:text-accent transition-colors px-3 py-1.5 rounded-lg hover:bg-surface2"
            >
              Sign In
            </Link>

            <Link
              href="/"
              className="btn-primary-glow inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold"
            >
              <span className="glow-layer" />
              Sign Up free
            </Link>
          </div>

          {/* ── Hamburger (mobile) ── */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={toggle}
              aria-label="Toggle dark mode"
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-stroke hover:bg-surface2 transition-colors"
            >
              {dark
                ? <Sun  className="w-4 h-4 text-accent" />
                : <Moon className="w-4 h-4 text-muted"  />}
            </button>
            <button
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-stroke hover:bg-surface2 transition-colors"
            >
              {mobileOpen
                ? <X    className="w-4 h-4 text-fg" />
                : <Menu className="w-4 h-4 text-fg" />}
            </button>
          </div>
        </div>

        {/* ── Mobile dropdown ── */}
        {mobileOpen && (
          <div className="md:hidden border-t border-stroke bg-surface/95 backdrop-blur-md animate-slide-down">
            <div className="max-w-7xl mx-auto px-4 py-3 space-y-0.5">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center py-2.5 px-3 rounded-xl text-sm font-medium text-muted hover:text-fg hover:bg-surface2 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-3 border-t border-stroke mt-2 grid grid-cols-2 gap-2">
                <Link
                  href="/"
                  className="flex items-center justify-center py-2.5 px-4 rounded-xl text-sm font-medium text-fg border border-stroke hover:bg-surface2 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/"
                  className="btn-primary-glow flex items-center justify-center py-2.5 px-4 rounded-xl text-sm font-semibold"
                >
                  <span className="glow-layer" />
                  Sign Up free
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
