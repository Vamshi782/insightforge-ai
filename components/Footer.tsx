"use client";

import { Github, Linkedin, BarChart2 } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-stroke bg-surface mt-16">
      <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-muted">
          <BarChart2 className="w-4 h-4 text-accent" />
          <span>
            Built by{" "}
            <span className="font-semibold text-fg">
              Vamshi Krishna Korutla
            </span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="https://linkedin.com/in/vamshi-krishna-korutla"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-muted hover:text-accent transition-colors border border-stroke rounded-lg px-3 py-1.5 hover:border-accent"
          >
            <Linkedin className="w-3.5 h-3.5" />
            LinkedIn
          </Link>
          <Link
            href="https://github.com/vamshi-krishna-korutla"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-muted hover:text-accent transition-colors border border-stroke rounded-lg px-3 py-1.5 hover:border-accent"
          >
            <Github className="w-3.5 h-3.5" />
            GitHub
          </Link>
        </div>

        <p className="text-xs text-muted">
          © {new Date().getFullYear()} InsightForge AI
        </p>
      </div>
    </footer>
  );
}
