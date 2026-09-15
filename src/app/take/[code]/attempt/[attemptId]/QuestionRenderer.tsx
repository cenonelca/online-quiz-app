"use client";

import type { RpcQuestion, CurrentAnswer } from "./types";

export default function QuestionRenderer({
  question,
  index,
  answer,
  onChange,
}: {
  question: RpcQuestion;
  index: number;
  answer: CurrentAnswer;
  onChange: (next: CurrentAnswer) => void;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5">
      <div className="flex items-baseline justify-between mb-3">
        <span className="text-base font-semibold text-slate-400">
          Question {index + 1}
        </span>
        <span className="text-sm text-slate-400">
          {question.points} pt{question.points === 1 ? "" : "s"}
        </span>
      </div>
      <p className="whitespace-pre-wrap font-medium text-lg leading-relaxed mb-4">
        {question.prompt}
      </p>

      {question.type === "true_false" && (
        <div className="flex flex-wrap gap-3">
          {[
            ["true", "True"],
            ["false", "False"],
          ].map(([val, label]) => (
            <label
              key={val}
              className="flex items-center gap-2 border border-slate-300 rounded-md px-4 py-3 text-base cursor-pointer has-[:checked]:border-slate-900 has-[:checked]:bg-slate-50"
            >
              <input
                type="radio"
                name={`q-${question.id}`}
                checked={answer.boolean_answer === (val === "true")}
                onChange={() => onChange({ boolean_answer: val === "true" })}
                className="h-4 w-4 shrink-0"
              />
              {label}
            </label>
          ))}
        </div>
      )}

      {question.type === "multiple_choice" && (
        <div className="space-y-2">
          {(question.choices || []).map((c) => (
            <label
              key={c.id}
              className="flex items-center gap-2 border border-slate-300 rounded-md px-4 py-3 text-base cursor-pointer has-[:checked]:border-slate-900 has-[:checked]:bg-slate-50"
            >
              <input
                type="radio"
                name={`q-${question.id}`}
                checked={answer.choice_id === c.id}
                onChange={() => onChange({ choice_id: c.id })}
                className="h-4 w-4 shrink-0"
              />
              {c.text}
            </label>
          ))}
        </div>
      )}

      {question.type === "identification" && (
        <input
          value={answer.text_answer ?? ""}
          onChange={(e) => onChange({ text_answer: e.target.value })}
          placeholder="Type your answer"
          className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base"
        />
      )}

      {question.type === "numerical" && (
        <input
          type="number"
          step="any"
          value={answer.numerical_answer ?? ""}
          onChange={(e) =>
            onChange({
              numerical_answer: e.target.value === "" ? null : Number(e.target.value),
            })
          }
          placeholder="Enter a number"
          className="w-full sm:w-48 rounded-md border border-slate-300 px-3 py-2.5 text-base"
        />
      )}

      {question.type === "essay" && (
        <textarea
          value={answer.text_answer ?? ""}
          onChange={(e) => onChange({ text_answer: e.target.value })}
          rows={6}
          placeholder="Write your answer"
          className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base"
        />
      )}
    </div>
  );
}
