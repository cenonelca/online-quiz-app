"use client";

import { useActionState, useRef, useState } from "react";
import { importQuestions } from "@/app/teacher/actions";

type State = { error?: string; success?: string };

export default function ImportForm({ quizId }: { quizId: string }) {
  const [state, formAction, pending] = useActionState<State, FormData>(
    (prev, formData) => importQuestions(quizId, prev, formData),
    {}
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>("");

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <h3 className="text-sm font-medium">Import questions from Excel, Word, or PDF</h3>
        <div className="flex items-center gap-3">
          <a href="/api/import-template" className="text-xs text-slate-500 underline">
            Excel template
          </a>
          <a href="/api/import-template-docx" className="text-xs text-slate-500 underline">
            Word template
          </a>
          <a href="/api/import-template-pdf" className="text-xs text-slate-500 underline">
            PDF template
          </a>
        </div>
      </div>
      <p className="text-xs text-slate-500 mb-2">
        Upload a .xlsx spreadsheet, or a .docx / .pdf file that follows the numbered
        question template from the downloads above.
      </p>
      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          name="file"
          accept=".xlsx,.docx,.pdf"
          required
          className="hidden"
          onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-sm border border-slate-300 rounded-md px-3 py-1.5 hover:bg-slate-100"
        >
          Browse…
        </button>
        <span className="text-sm text-slate-500 truncate max-w-[200px]">
          {fileName || "No file selected."}
        </span>
        <button
          type="submit"
          disabled={pending}
          className="text-sm border border-slate-300 rounded-md px-3 py-1.5 hover:bg-slate-100 disabled:opacity-60"
        >
          {pending ? "Importing…" : "Import"}
        </button>
      </form>
      {state.error && <p className="text-sm text-red-600 mt-2">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-600 mt-2">{state.success}</p>}
    </div>
  );
}
