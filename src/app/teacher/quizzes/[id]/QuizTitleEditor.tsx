"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { updateQuizTitle } from "@/app/teacher/actions";

export default function QuizTitleEditor({
  quizId,
  title,
}: {
  quizId: string;
  title: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    if (!editing) setValue(title);
  }, [title, editing]);

  function save() {
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Title can't be empty.");
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await updateQuizTitle(quizId, trimmed);
      if (result?.error) {
        setError(result.error);
      } else {
        setEditing(false);
      }
    });
  }

  function cancel() {
    setValue(title);
    setError("");
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="mt-1">
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                save();
              } else if (e.key === "Escape") {
                cancel();
              }
            }}
            disabled={pending}
            className="text-2xl font-bold border border-slate-300 rounded-md px-2 py-1 w-full max-w-xl disabled:opacity-60"
          />
          <button
            onClick={save}
            disabled={pending}
            className="text-sm border border-slate-300 rounded-md px-3 py-1.5 hover:bg-slate-100 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save"}
          </button>
          <button
            onClick={cancel}
            disabled={pending}
            className="text-sm text-slate-500 hover:underline disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-1">
      <h1 className="text-2xl font-bold">{title || "Untitled quiz"}</h1>
      <button
        onClick={() => setEditing(true)}
        className="text-xs text-slate-500 hover:text-slate-900 border border-slate-300 rounded-md px-2 py-1 hover:bg-slate-100"
        title="Edit quiz title"
      >
        Edit
      </button>
    </div>
  );
}

