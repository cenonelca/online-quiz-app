"use client";

import { useTransition } from "react";
import {
  updateQuestion,
  deleteQuestion,
  addChoice,
  deleteChoice,
} from "@/app/teacher/actions";
import { QUESTION_TYPE_LABELS, type Question } from "@/lib/types";
import ConfirmButton from "./ConfirmButton";

export default function QuestionCard({
  quizId,
  question,
  index,
}: {
  quizId: string;
  question: Question;
  index: number;
}) {
  const [pending, startTransition] = useTransition();
  const choices = [...(question.choices || [])].sort(
    (a, b) => a.order_index - b.order_index
  );

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-slate-400">Q{index + 1}</span>
          <span className="bg-slate-100 text-slate-700 rounded-full px-2 py-0.5 text-xs">
            {QUESTION_TYPE_LABELS[question.type]}
          </span>
        </div>
        <form action={deleteQuestion.bind(null, quizId, question.id)}>
          <ConfirmButton
            message="Delete this question?"
            className="text-xs text-red-600 hover:underline"
          >
            Delete
          </ConfirmButton>
        </form>
      </div>

      <form
        action={(formData) =>
          startTransition(() => updateQuestion(quizId, question.id, formData))
        }
        className="space-y-4"
      >
        <input type="hidden" name="type" value={question.type} />

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Question prompt
          </label>
          <textarea
            name="prompt"
            defaultValue={question.prompt}
            required
            rows={2}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Points
            </label>
            <input
              type="number"
              name="points"
              min={0}
              step="0.5"
              defaultValue={question.points}
              className="w-24 rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Time limit (sec, used if quiz is timed per-question)
            </label>
            <input
              type="number"
              name="time_limit_seconds"
              min={5}
              placeholder="none"
              defaultValue={question.time_limit_seconds ?? ""}
              className="w-40 rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {question.type === "true_false" && (
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Correct answer
            </label>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  name="correct_boolean"
                  value="true"
                  defaultChecked={question.correct_boolean !== false}
                />
                True
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  name="correct_boolean"
                  value="false"
                  defaultChecked={question.correct_boolean === false}
                />
                False
              </label>
            </div>
          </div>
        )}

        {question.type === "multiple_choice" && (
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Choices (select the correct one)
            </label>
            <div className="space-y-2">
              {choices.map((c) => (
                <div key={c.id} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct_choice_id"
                    value={c.id}
                    defaultChecked={c.is_correct}
                    className="shrink-0"
                  />
                  <input type="hidden" name="choice_id" value={c.id} />
                  <input
                    name="choice_text"
                    defaultValue={c.text}
                    placeholder="Choice text"
                    className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => deleteChoice(quizId, c.id)}
                    disabled={choices.length <= 2}
                    className="text-xs text-red-600 hover:underline disabled:opacity-30 disabled:no-underline shrink-0"
                    title={choices.length <= 2 ? "At least 2 choices required" : "Remove"}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => addChoice(quizId, question.id)}
              className="mt-2 text-xs text-slate-600 hover:underline"
            >
              + Add choice
            </button>
          </div>
        )}

        {question.type === "identification" && (
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Accepted answers (comma-separated, any one matches)
            </label>
            <input
              name="identification_answers"
              defaultValue={(question.identification_answers || []).join(", ")}
              placeholder="e.g. photosynthesis, photo-synthesis"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <label className="flex items-center gap-2 text-xs mt-2">
              <input
                type="checkbox"
                name="identification_case_sensitive"
                defaultChecked={question.identification_case_sensitive}
                className="rounded"
              />
              Case-sensitive
            </label>
          </div>
        )}

        {question.type === "numerical" && (
          <div className="flex gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Correct answer
              </label>
              <input
                type="number"
                step="any"
                name="numerical_answer"
                defaultValue={question.numerical_answer ?? ""}
                className="w-32 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Tolerance (±)
              </label>
              <input
                type="number"
                step="any"
                min={0}
                name="numerical_tolerance"
                defaultValue={question.numerical_tolerance ?? 0}
                className="w-32 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}

        {question.type === "essay" && (
          <p className="text-xs text-slate-500">
            Essay answers are graded manually from the Results page.
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="text-sm border border-slate-300 rounded-md px-3 py-1.5 hover:bg-slate-100 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save question"}
        </button>
      </form>
    </div>
  );
}
