"use client";

import { useState, useTransition } from "react";
import { updateQuizSettings } from "@/app/teacher/actions";
import type { Quiz } from "@/lib/types";

export default function QuizSettingsForm({ quiz }: { quiz: Quiz }) {
  const [mode, setMode] = useState(quiz.time_limit_mode);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          await updateQuizSettings(quiz.id, formData);
          setSaved(true);
          setTimeout(() => setSaved(false), 1500);
        })
      }
      className="space-y-5"
    >
      <div>
        <label className="block text-sm font-medium mb-1">Title</label>
        <input
          name="title"
          defaultValue={quiz.title}
          required
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">
          Description / instructions
        </label>
        <textarea
          name="description"
          defaultValue={quiz.description}
          rows={2}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Time limit</label>
        <div className="flex flex-wrap items-center gap-3">
          <select
            name="time_limit_mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as Quiz["time_limit_mode"])}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="whole_quiz">Whole quiz</option>
            <option value="per_question">Per question</option>
            <option value="none">No time limit</option>
          </select>
          {mode === "whole_quiz" && (
            <div className="flex items-center gap-2 text-sm">
              <input
                type="number"
                name="time_limit_minutes"
                min={1}
                defaultValue={
                  quiz.time_limit_seconds ? Math.round(quiz.time_limit_seconds / 60) : 30
                }
                className="w-24 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <span className="text-slate-500">minutes for the whole quiz</span>
            </div>
          )}
          {mode === "per_question" && (
            <p className="text-sm text-slate-500">
              Set a time limit on each question below.
            </p>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="shuffle_questions"
            defaultChecked={quiz.shuffle_questions}
            className="rounded"
          />
          Randomize question order per student
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="shuffle_choices"
            defaultChecked={quiz.shuffle_choices}
            className="rounded"
          />
          Randomize multiple-choice order
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="require_fullscreen"
            defaultChecked={quiz.require_fullscreen}
            className="rounded"
          />
          Require fullscreen (anti-cheating)
        </label>
        <div className="flex items-center gap-2 text-sm">
          <span>Max attempts per student</span>
          <input
            type="number"
            name="max_attempts"
            min={1}
            defaultValue={quiz.max_attempts}
            className="w-16 rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="bg-slate-900 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-slate-700 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save settings"}
        </button>
        {saved && <span className="text-sm text-emerald-600">Saved</span>}
      </div>
    </form>
  );
}
