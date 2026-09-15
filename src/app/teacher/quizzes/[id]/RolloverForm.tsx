"use client";

import { useActionState, useState } from "react";
import { rolloverQuiz } from "@/app/teacher/actions";

type State = { error?: string };

export default function RolloverForm({
  quizId,
  currentTitle,
}: {
  quizId: string;
  currentTitle: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<State, FormData>(
    (prev, formData) => rolloverQuiz(quizId, prev, formData),
    {}
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm border border-slate-300 rounded-md px-3 py-2 hover:bg-slate-100"
      >
        Roll over to new quiz
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          New quiz title
        </label>
        <input
          name="title"
          required
          autoFocus
          defaultValue={`${currentTitle} (Copy)`}
          placeholder="New quiz title"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm min-w-[240px]"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="text-sm bg-slate-900 text-white rounded-md px-4 py-2 font-medium hover:bg-slate-700 disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create copy"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-sm text-slate-500 hover:underline px-2 py-2"
      >
        Cancel
      </button>
      {state.error && <p className="text-sm text-red-600 w-full">{state.error}</p>}
    </form>
  );
}
