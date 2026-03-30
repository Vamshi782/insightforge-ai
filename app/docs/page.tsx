import Link from "next/link";
import { BarChart2, Upload, Sparkles, Filter, Download, MessageSquare, ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "Docs — InsightForge AI",
  description: "Learn how to use InsightForge AI to turn your CSV and Excel files into instant dashboards.",
};

const sections = [
  {
    icon: <Upload className="w-5 h-5 text-accent" />,
    title: "1. Upload your data",
    body: "Drag and drop any CSV or Excel (.xlsx) file onto the upload zone on the home page. InsightForge supports files up to 50 MB and automatically detects the file format using magic-byte inspection — no need to rename files.",
  },
  {
    icon: <Sparkles className="w-5 h-5 text-accent" />,
    title: "2. Automatic cleaning",
    body: "InsightForge scans every column and automatically: trims whitespace, converts numeric strings to numbers, parses dates, detects and excludes identifier columns (IDs, ZIP codes, phone numbers) from charts and KPIs, and removes duplicate or empty rows. The Cleaning Log shows every step applied.",
  },
  {
    icon: <BarChart2 className="w-5 h-5 text-accent" />,
    title: "3. Auto-generated charts",
    body: "Charts are generated based on detected column roles — metric, dimension, date, or identifier. You get KPI cards for key metrics, line charts for trends over time, bar charts for category comparisons, pie charts for distributions, and scatter plots for correlations. Click any chart type button in the header to switch views.",
  },
  {
    icon: <Filter className="w-5 h-5 text-accent" />,
    title: "4. Filtering",
    body: "Use the Filter bar above the data table to narrow down rows by categorical values (multi-select) or numeric ranges (dual-range slider). Identifier columns are automatically excluded from filters. Active filter counts are shown on each chip. Click 'Clear all' to reset.",
  },
  {
    icon: <MessageSquare className="w-5 h-5 text-accent" />,
    title: "5. AI chat",
    body: "Ask any question about your data in the AI chat panel. InsightForge sends your dataset schema (column names, types, ranges, samples) and your question to Gemini 1.5 Flash. The AI can suggest SQL queries, explain trends, identify outliers, and compare segments. Conversation history is maintained within the session.",
  },
  {
    icon: <Download className="w-5 h-5 text-accent" />,
    title: "6. Export",
    body: "Click the download icon on any chart to export it as a PNG. The Export button in the toolbar downloads the cleaned dataset as a CSV file. The Share button copies a shareable link to your clipboard (link sharing is coming soon — currently copies the current URL).",
  },
];

export default function DocsPage() {
  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-12 flex-1">
        {/* Back */}
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg mb-8 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to app
        </Link>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-fg mb-3">Documentation</h1>
          <p className="text-muted text-base leading-relaxed">
            InsightForge AI turns any CSV or Excel file into an interactive dashboard in seconds — no code, no sign-up required.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {sections.map((s) => (
            <div key={s.title} className="bg-surface border border-stroke rounded-xl p-6">
              <div className="flex items-center gap-2.5 mb-3">
                {s.icon}
                <h2 className="text-base font-semibold text-fg">{s.title}</h2>
              </div>
              <p className="text-sm text-muted leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>

        {/* Supported formats */}
        <div className="mt-10 bg-surface border border-stroke rounded-xl p-6">
          <h2 className="text-base font-semibold text-fg mb-4">Supported formats</h2>
          <div className="grid grid-cols-2 gap-3 text-sm text-muted">
            {[
              ["CSV", "Comma, semicolon, tab, or pipe delimited. Auto-detected."],
              ["Excel (.xlsx)", "Modern Excel format. All sheets — first sheet is loaded."],
              ["TSV", "Tab-separated values. Treated as CSV with tab delimiter."],
              ["UTF-8 / Latin-1", "Both encodings are handled automatically."],
            ].map(([fmt, desc]) => (
              <div key={fmt} className="bg-surface2 rounded-lg px-3 py-2.5">
                <p className="font-semibold text-fg text-xs mb-0.5">{fmt}</p>
                <p className="text-xs">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-10">
          <h2 className="text-base font-semibold text-fg mb-4">FAQ</h2>
          <div className="space-y-4">
            {[
              {
                q: "Is my data stored anywhere?",
                a: "No. All data is processed entirely in your browser. Nothing is sent to any server except the column schema (names, types, ranges, and a few sample values) when you use the AI chat feature.",
              },
              {
                q: "Why are some columns missing from the KPI cards?",
                a: "InsightForge detects identifier columns — things like Row ID, Customer ID, ZIP codes, and phone numbers — and excludes them from KPIs and chart axes since they don't represent meaningful measures.",
              },
              {
                q: "The AI chat isn't working. What should I check?",
                a: "The AI feature requires a GOOGLE_API_KEY environment variable to be set. If you're running locally, add it to .env.local. If deployed on Vercel, add it in Project Settings → Environment Variables.",
              },
              {
                q: "Can I upload multiple files?",
                a: "Yes — upload a second file and it will appear as a separate dataset tab. You can switch between datasets and compare them side by side.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="border-b border-stroke pb-4 last:border-0 last:pb-0">
                <p className="text-sm font-semibold text-fg mb-1">{q}</p>
                <p className="text-sm text-muted leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer CTA */}
        <div className="mt-12 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-accent text-accent-fg px-5 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            <BarChart2 className="w-4 h-4" />
            Open InsightForge AI
          </Link>
        </div>
      </main>
    </>
  );
}
