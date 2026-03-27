"use client";

import { Dataset } from "@/lib/types";
import { Database } from "lucide-react";

interface Props {
  datasets: Dataset[];
  activeId: string;
  onSwitch: (id: string) => void;
}

export default function DatasetSwitcher({ datasets, activeId, onSwitch }: Props) {
  if (datasets.length <= 1) return null;

  return (
    <div className="flex items-center gap-1.5">
      <Database className="w-3.5 h-3.5 text-muted" />
      {datasets.map((ds) => (
        <button
          key={ds.id}
          onClick={() => onSwitch(ds.id)}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
            ds.id === activeId
              ? "bg-accent text-accent-fg border-accent shadow-sm shadow-accent/20"
              : "bg-surface text-muted border-stroke hover:border-accent/40 hover:text-fg"
          }`}
        >
          {ds.name}
        </button>
      ))}
    </div>
  );
}
