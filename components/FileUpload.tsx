"use client";

import { useRef, useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";

interface Props {
  label: string;
  onFile: (file: File) => void;
  loading: boolean;
  fileName?: string;
  onClear: () => void;
}

export default function FileUpload({
  label,
  onFile,
  loading,
  fileName,
  onClear,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFile(file: File | undefined) {
    if (file) onFile(file);
  }

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-6 transition-all duration-150 cursor-pointer relative ${
        dragOver
          ? "border-accent bg-accent/5 scale-[1.01]"
          : fileName
            ? "border-success/50 bg-success/5"
            : "border-stroke hover:border-muted bg-surface"
      }`}
      onClick={() => !fileName && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFile(e.dataTransfer.files[0]);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls,.txt"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {fileName ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-fg">
            {loading ? (
              <Loader2 className="w-4 h-4 text-accent animate-spin shrink-0" />
            ) : (
              <Upload className="w-4 h-4 text-success shrink-0" />
            )}
            <span className="font-medium truncate max-w-[200px]">
              {fileName}
            </span>
            {loading && (
              <span className="text-xs text-accent animate-pulse">
                Processing…
              </span>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="text-muted hover:text-danger transition-colors ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="text-center select-none">
          <Upload className="w-8 h-8 text-muted mx-auto mb-2" />
          <p className="text-sm font-medium text-fg">{label}</p>
          <p className="text-xs text-muted mt-1">
            CSV or XLSX · Drag & drop or click
          </p>
        </div>
      )}
    </div>
  );
}
