import Link from "next/link";
import { Check, X as XIcon, Zap, Crown, ArrowLeft, BarChart2, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import UpgradeButton from "@/components/UpgradeButton";

export const metadata = {
  title: "Pricing — InsightForge AI",
  description: "Start free. Upgrade to Pro for $3/week or $12/month.",
};

const FREE_FEATURES = [
  "Upload CSV & Excel files",
  "Auto data cleaning & type detection",
  "KPI cards with smart formatting",
  "Line, bar, pie & scatter charts",
  "Draggable dashboard layout",
  "Column-aware smart filtering",
  "AI chat (5 questions/day)",
  "Export cleaned CSV",
  "Data health score",
  "No sign-up required",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Unlimited AI chat questions",
  "SQL query generation",
  "Multi-dataset join & analysis",
  "Priority AI responses (GPT-4 class)",
  "Saved dashboards & history",
  "Team sharing & collaboration",
  "Larger file uploads (up to 200 MB)",
  "Scheduled data refresh",
  "Priority support",
];

const COMPARISON = [
  { feature: "File upload (CSV & Excel)", free: true, pro: true },
  { feature: "Auto data cleaning", free: true, pro: true },
  { feature: "KPI cards & charts", free: true, pro: true },
  { feature: "AI chat questions", free: "5 / day", pro: "Unlimited" },
  { feature: "SQL query generation", free: false, pro: true },
  { feature: "Multi-dataset join", free: true, pro: true },
  { feature: "Saved dashboards", free: false, pro: true },
  { feature: "Team sharing", free: false, pro: true },
  { feature: "File size limit", free: "50 MB", pro: "200 MB" },
  { feature: "Priority AI model", free: false, pro: true },
  { feature: "Priority support", free: false, pro: true },
];

function FeatureRow({ value }: { feature: string; value: boolean | string }) {
  if (value === true) {
    return <Check className="w-4 h-4 text-success mx-auto" />;
  }
  if (value === false) {
    return <XIcon className="w-4 h-4 text-muted/40 mx-auto" />;
  }
  return <span className="text-xs font-medium text-fg">{value}</span>;
}

export default function PricingPage() {
  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-12 flex-1">
        {/* Back */}
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg mb-8 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to app
        </Link>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-1.5 bg-accent/10 text-accent text-xs font-semibold px-3 py-1.5 rounded-full border border-accent/20 mb-4">
            <Sparkles className="w-3 h-3" />
            Simple, honest pricing
          </div>
          <h1 className="text-3xl font-bold text-fg mb-3">Start free. Scale when ready.</h1>
          <p className="text-muted text-base max-w-md mx-auto leading-relaxed">
            InsightForge AI is free to get started. Upgrade to Pro for unlimited AI, saved dashboards, and team features.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-14">
          {/* Free */}
          <div className="bg-surface border border-stroke rounded-2xl p-6 flex flex-col">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 bg-surface2 border border-stroke rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-muted" />
              </div>
              <h2 className="text-lg font-bold text-fg">Free</h2>
            </div>
            <div className="mb-1">
              <span className="text-4xl font-extrabold text-fg">$0</span>
              <span className="text-sm text-muted ml-1">/ forever</span>
            </div>
            <p className="text-sm text-muted mb-6 leading-relaxed">
              Everything you need to explore and visualise data instantly. No credit card, no account.
            </p>

            <ul className="space-y-2.5 mb-8 flex-1">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-fg">
                  <Check className="w-4 h-4 text-success shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/"
              className="block w-full text-center border border-stroke bg-surface2 text-fg px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-stroke/40 transition-colors"
            >
              Open InsightForge AI
            </Link>
          </div>

          {/* Pro */}
          <div className="bg-surface border-2 border-accent/40 rounded-2xl p-6 flex flex-col relative overflow-hidden shadow-lg shadow-accent/5">
            {/* Popular badge */}
            <div className="absolute top-4 right-4 bg-accent text-accent-fg text-[10px] font-bold px-2.5 py-1 rounded-full">
              MOST POPULAR
            </div>

            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 bg-accent/10 border border-accent/20 rounded-lg flex items-center justify-center">
                <Crown className="w-4 h-4 text-accent" />
              </div>
              <h2 className="text-lg font-bold text-fg">Pro</h2>
            </div>

            {/* Pricing toggle area */}
            <div className="mb-1">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-fg">$3</span>
                <span className="text-sm text-muted">/ week</span>
              </div>
              <p className="text-xs text-muted mt-0.5">
                or <span className="font-semibold text-fg">$12 / month</span>
                <span className="ml-1.5 text-success font-semibold">Save 25%</span>
              </p>
            </div>
            <p className="text-sm text-muted mb-6 leading-relaxed">
              Unlimited AI, saved dashboards, team collaboration, and priority support.
            </p>

            <ul className="space-y-2.5 mb-8 flex-1">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-fg">
                  <Check className="w-4 h-4 text-accent shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <UpgradeButton />
            <p className="text-xs text-muted text-center mt-2">Cancel anytime · Instant access</p>
          </div>
        </div>

        {/* Feature comparison table */}
        <div className="bg-surface border border-stroke rounded-2xl overflow-hidden mb-12">
          <div className="px-6 py-4 border-b border-stroke">
            <h2 className="text-base font-semibold text-fg">Feature comparison</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stroke">
                  <th className="text-left text-xs font-semibold text-muted px-6 py-3 w-1/2">Feature</th>
                  <th className="text-center text-xs font-semibold text-muted px-4 py-3 w-1/4">Free</th>
                  <th className="text-center text-xs font-semibold text-accent px-4 py-3 w-1/4">Pro</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={`border-b border-stroke/50 last:border-0 ${i % 2 === 0 ? "" : "bg-surface2/30"}`}
                  >
                    <td className="text-xs text-fg px-6 py-3 font-medium">{row.feature}</td>
                    <td className="px-4 py-3 text-center">
                      <FeatureRow feature={row.feature} value={row.free} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <FeatureRow feature={row.feature} value={row.pro} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-12">
          <h2 className="text-base font-semibold text-fg mb-5">FAQ</h2>
          <div className="space-y-5 bg-surface border border-stroke rounded-2xl p-6">
            {[
              {
                q: "Do I need an account for the free plan?",
                a: "No. InsightForge AI works entirely in your browser. No sign-up, no account, no data stored on our servers.",
              },
              {
                q: "What counts as an AI question?",
                a: "Each time you send a message in the AI chat counts as one question. Suggested question clicks also count. Initial auto-analysis does not count.",
              },
              {
                q: "Is my data safe?",
                a: "Your data never leaves your browser except for the dataset schema (column names, types, sample values) sent when using AI chat. No raw data is uploaded.",
              },
              {
                q: "When will Pro launch?",
                a: "We're actively building Pro features. Click 'Upgrade to Pro' to get notified when it launches — early access users get 50% off for life.",
              },
              {
                q: "Can I cancel Pro anytime?",
                a: "Yes. Pro is billed weekly or monthly with no long-term commitment. Cancel anytime from your account settings.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="border-b border-stroke pb-5 last:border-0 last:pb-0">
                <p className="text-sm font-semibold text-fg mb-1">{q}</p>
                <p className="text-sm text-muted leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-surface border border-stroke rounded-2xl p-8">
          <h3 className="text-lg font-bold text-fg mb-2">Ready to explore your data?</h3>
          <p className="text-sm text-muted mb-5">Start for free — no sign-up, no card required.</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-accent text-accent-fg px-6 py-3 rounded-xl font-semibold text-sm hover:bg-accent-hover transition-colors shadow-md shadow-accent/20"
          >
            <BarChart2 className="w-4 h-4" />
            Get started free
          </Link>
        </div>
      </main>
    </>
  );
}
