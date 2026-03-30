"use client";

import { Github, Linkedin, BarChart2 } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-stroke/60 bg-surface/80 backdrop-blur-sm mt-8">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Top row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-5 border-b border-stroke/60">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-accent" />
            <span className="font-bold text-sm text-fg">InsightForge AI</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted">
            <Link href="/docs"    className="hover:text-fg transition-colors">Docs</Link>
            <Link href="/pricing" className="hover:text-fg transition-colors">Pricing</Link>
            <Link href="/#features" className="hover:text-fg transition-colors">Features</Link>
            <Link href="/#reviews"  className="hover:text-fg transition-colors">Reviews</Link>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="https://linkedin.com/in/vamshi-krishna-korutla"
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-muted hover:text-accent transition-colors border border-stroke rounded-lg px-2.5 py-1.5 hover:border-accent"
            >
              <Linkedin className="w-3.5 h-3.5" />
              LinkedIn
            </Link>
            <Link
              href="https://github.com/Vamushi782/insightforge-ai"
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-muted hover:text-accent transition-colors border border-stroke rounded-lg px-2.5 py-1.5 hover:border-accent"
            >
              <Github className="w-3.5 h-3.5" />
              GitHub
            </Link>
          </div>
        </div>
        {/* Bottom row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-4 text-xs text-muted">
          <p>© {new Date().getFullYear()} InsightForge AI · Built by <span className="font-semibold text-fg">Vamushi Krishna Korutla</span></p>
          <p>All data processed in your browser · No sign-up required</p>
        </div>
      </div>
    </footer>
  );
}
