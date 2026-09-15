"use client";

import { useState, useTransition } from "react";
import type { Answer, Attempt, Question } from "@/lib/types";
import { gradeEssay } from "@/app/teacher/actions";

export type AttemptWithAnswers = Attempt & {
  answers: Answer[];
  proctoring_events: { count: number }[];
};

function formatDuration(startedAt: string, submittedAt: string | null) {
  if (!submittedAt) return "—";
  const ms = new Date(submittedAt).getTime() - new Date(startedAt).getTime();
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}m ${s}s`;
}

export default function AttemptRow({
  quizId,
  attempt,
  questions,
  maxScore,
}: {
  quizId: string;
  attempt: AttemptWithAnswers;
  questions: Question[];
  maxScore: number;
}) {
  const [open, setOpen] = useState(false);
  const answersByQuestion = new Map(attempt.answers.map((a) => [a.question_id, a]));
  const flagCount = attempt.proctoring_events?.[0]?.count ?? 0;
  const pendingEssays = attempt.answers.filter(
    (a) => a.needs_manual_grade && a.is_correct === null
  ).length;

  const pct =
    attempt.score !== null && attempt.score !== undefined && maxScore > 0
      ? Math.round((attempt.score / maxScore) * 100)
      : null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 p-4 text-left"
      >
        <div>
          <div className="font-medium flex items-center gap-2 flex-wrap">
            {attempt.student_name}
            {(attempt.course || attempt.section) && (
              <span className="text-xs text-slate-400">
                {[attempt.course, attempt.section].filter(Boolean).join(" · ")}
              </span>
            )}
            {attempt.student_id_number && (
              <span className="text-xs text-slate-400">{attempt.student_id_number}</span>
            )}
            {attempt.student_email && (
              <span className="text-xs text-slate-400">{attempt.student_email}</span>
            )}
            {attempt.auto_submitted && (
              <span className="text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">
                auto-submitted
              </span>
            )}
            {pendingEssays > 0 && (
              <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">
                {pendingEssays} to grade
              </span>
            )}
            {flagCount > 0 && (
              <span className="text-xs bg-red-100 text-red-700 rounded-full px-2 py-0.5">
                {flagCount} flag{flagCount === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <div className="text-sm text-slate-500 mt-1">
            {attempt.status === "in_progress"
              ? "In progress"
              : `Score: ${attempt.score ?? 0} / ${maxScore} ${pct !== null ? `(${pct}%)` : ""}`}
            {" · "}
            Time: {formatDuration(attempt.started_at, attempt.submitted_at)}
          </div>
        </div>
        <span className="text-slate-400 text-sm shrink-0">{open ? "Hide" : "Review"}</span>
      </button>

      {open && (
        <div className="border-t border-slate-200 p-4 space-y-4">
          {questions.map((q, i) => {
            const a = answersByQuestion.get(q.id);
            return (
              <QuestionReview
                key={q.id}
                quizId={quizId}
                index={i}
                question={q}
                answer={a}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function QuestionReview({
  quizId,
  index,
  question,
  answer,
}: {
  quizId: string;
  index: number;
  question: Question;
  answer?: Answer;
}) {
  const [pending, startTransition] = useTransition();
  const [points, setPoints] = useState(answer?.points_awarded ?? 0);

  const studentAnswerText = (() => {
    if (!answer) return <em className="text-slate-400">No answer</em>;
    switch (question.type) {
      case "true_false":
        return answer.boolean_answer === null ? "—" : answer.boolean_answer ? "True" : "False";
      case "multiple_choice": {
        const choice = question.choices?.find((c) => c.id === answer.choice_id);
        return choice?.text || "—";
      }
      case "identification":
        return answer.text_answer || "—";
      case "numerical":
        return answer.numerical_answer ?? "—";
      case "essay":
        return answer.text_answer || <em className="text-slate-400">No answer</em>;
    }
  })();

  const correctAnswerText = (() => {
    switch (question.type) {
      case "true_false":
        return question.correct_boolean ? "True" : "False";
      case "multiple_choice":
        return question.choices?.find((c) => c.is_correct)?.text || "—";
      case "identification":
        return (question.identification_answers || []).join(" / ");
      case "numerical":
        return `${question.numerical_answer} ± ${question.numerical_tolerance}`;
      case "essay":
        return null;
    }
  })();

  return (
    <div className="text-sm border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium">
          Q{index + 1}. {question.prompt}
        </p>
        <span
          className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
            answer?.is_correct === true
              ? "bg-emerald-100 text-emerald-700"
              : answer?.is_correct === false
              ? "bg-red-100 text-red-700"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {answer?.points_awarded ?? 0} / {question.points} pt
        </span>
      </div>
      <p className="mt-1 text-slate-700">
        <span className="text-slate-400">Answer: </span>
        {studentAnswerText}
      </p>
      {correctAnswerText !== null && (
        <p className="text-slate-500 text-xs mt-0.5">Correct: {correctAnswerText}</p>
      )}

      {question.type === "essay" && answer && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={question.points}
            step="0.5"
            value={points}
            onChange={(e) => setPoints(Number(e.target.value))}
            className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
          <span className="text-xs text-slate-400">/ {question.points}</span>
          <button
            disabled={pending}
            onClick={() =>
              startTransition(() => gradeEssay(quizId, answer.id, points, question.points))
            }
            className="text-xs border border-slate-300 rounded-md px-3 py-1.5 hover:bg-slate-100 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save grade"}
          </button>
          {answer.is_correct !== null && (
            <span className="text-xs text-emerald-600">Graded</span>
          )}
        </div>
      )}
    </div>
  );
}
