"use client";

import { useMemo, useState } from "react";
import { Dataset } from "@/lib/types";
import { findCommonColumns, joinDatasets } from "@/lib/join";
import { GitMerge, Loader2 } from "lucide-react";

interface Props {
  datasets: Dataset[];
  onJoin: (joined: Dataset) => void;
}

export default function JoinPanel({ datasets, onJoin }: Props) {
  const [joinKey, setJoinKey] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [ds1, ds2] = datasets;

  const commonColumns = useMemo(
    () => (ds1 && ds2 ? findCommonColumns(ds1, ds2) : []),
    [ds1, ds2]
  );

  if (!ds1 || !ds2) return null;

  async function handleJoin() {
    if (!joinKey) return;
    setJoining(true);
    setError(null);
    try {
      // Run in a timeout to allow UI to update
      await new Promise((r) => setTimeout(r, 10));
      const result = joinDatasets(ds1, ds2, joinKey);
      if (result.rowCount === 0) {
        setError("No matching rows found for the selected join key.");
      } else {
        onJoin(result);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Join failed");
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="bg-surface border border-stroke rounded-xl p-4 animate-slide-down">
      <div className="flex items-center gap-2 mb-3">
        <GitMerge className="w-4 h-4 text-accent" />
        <h3 className="text-sm font-semibold text-fg">Join Datasets</h3>
        <span className="text-xs text-muted">
          {ds1.name} ⋈ {ds2.name}
        </span>
      </div>

      {commonColumns.length === 0 ? (
        <p className="text-xs text-muted bg-surface2 rounded-lg px-3 py-2">
          No common columns found between the two datasets.
        </p>
      ) : (
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <label className="block text-xs text-muted mb-1">Join Key</label>
            <select
              value={joinKey}
              onChange={(e) => setJoinKey(e.target.value)}
              className="text-sm bg-surface2 border border-stroke rounded-lg px-3 py-1.5 text-fg focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">Select column…</option>
              {commonColumns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleJoin}
            disabled={!joinKey || joining}
            className="flex items-center gap-1.5 mt-4 text-sm bg-accent text-accent-fg px-4 py-1.5 rounded-lg disabled:opacity-50 hover:bg-accent-hover transition-colors"
          >
            {joining ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <GitMerge className="w-3.5 h-3.5" />
            )}
            {joining ? "Joining…" : "Run Inner Join"}
          </button>

          {error && (
            <p className="text-xs text-danger mt-4">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
