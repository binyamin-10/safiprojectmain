"use client";

import { useRef } from "react";
import { Upload, FileText } from "lucide-react";

interface PdfDropZoneProps {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  /** Label shown inside the zone when empty */
  label?: string;
  subLabel?: string;
}

/**
 * Reusable PDF drag-&-drop upload zone.
 * Used by marksheet upload AND internship certificate upload in the student portal.
 */
export default function PdfDropZone({
  file,
  onFileSelect,
  label = "Upload File",
  subLabel = "Drag & drop your PDF here, or browse files",
}: PdfDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    if (selected && selected.type !== "application/pdf" && !selected.name.toLowerCase().endsWith(".pdf")) {
      return; // Validation handled by parent via onFileSelect(null)
    }
    onFileSelect(selected);
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
        file
          ? "border-emerald-500/40 bg-emerald-500/5"
          : "border-indigo-500/30 hover:border-indigo-500/60 bg-indigo-50/5"
      }`}
    >
      <input
        type="file"
        accept="application/pdf"
        onChange={handleChange}
        ref={inputRef}
        className="hidden"
      />

      {file ? (
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400">
            <FileText className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <p className="font-semibold text-sm text-slate-100">{file.name}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {(file.size / 1024 / 1024).toFixed(2)} MB • Ready to Upload
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFileSelect(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="text-xs text-rose-400 hover:text-rose-300 font-bold underline mt-1"
          >
            Remove File
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2.5">
          <div className="w-12 h-12 bg-indigo-500/15 border border-indigo-500/30 rounded-2xl flex items-center justify-center text-indigo-400">
            <Upload className="w-6 h-6 animate-bounce" />
          </div>
          <div>
            <p className="font-semibold text-sm text-slate-100">{label}</p>
            <p
              className="text-xs text-slate-400 mt-1 max-w-[220px] mx-auto leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: subLabel.replace("browse files", '<span class="text-indigo-400 font-bold underline">browse files</span>'),
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
