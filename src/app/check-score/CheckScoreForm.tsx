"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Choice = { id: string; text: string; is_correct: boolean };

type StudentAnswer = {
  choice_id: string | null;
  text_answer: string | null;
  numerical_answer: number | null;
  boolean_answer: boolean | null;
  is_correct: boolean | null;
  points_awarded: number | null;
  needs_manual_grade: boolean;
} | null;

type ScoreQuestion = {
  id: string;
  type: "true_false" | "multiple_choice" | "identification" | "numerical" | "essay";
  prompt: string;
  points: number;
  choices: Choice[] | null;
  correct_boolean: boolean | null;
  identification_answers: string[] | null;
  numerical_answer: number | null;
  numerical_tolerance: number | null;
  student_answer: StudentAnswer;
};

type ScoreResult = {
  quiz_title: string;
  student_name: string;
  score: number | null;
  max_score: number | null;
  has_pending_essay: boolean;
  questions: ScoreQuestion[];
};

function studentAnswerText(q: ScoreQuestion) {
  const a = q.student_answer;
  if (!a) return "No answer";
  switch (q.type) {
    case "true_false":
      return a.boolean_answer === null ? "—" : a.boolean_answer ? "True" : "False";
    case "multiple_choice": {
      const choice = q.choices?.find((c) => c.id === a.choice_id);
      return choice?.text || "—";
    }
    case "identification":
      return a.text_answer || "—";
    case "numerical":
      return a.numerical_answer ?? "—";
    case "essay":
      return a.text_answer || "No answer";
  }
}

function correctAnswerText(q: ScoreQuestion) {
  switch (q.type) {
    case "true_false":
      return q.correct_boolean ? "True" : "False";
    case "multiple_choice":
      return q.choices?.find((c) => c.is_correct)?.text || "—";
    case "identification":
      return (q.identification_answers || []).join(" / ");
    case "numerical":
      return `${q.numerical_answer} ± ${q.numerical_tolerance}`;
    case "essay":
      return null;
  }
}

export default function CheckScoreForm({ initialCode = "" }: { initialCode?: string }) {
  const [passkey, setPasskey] = useState(initialCode);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ScoreResult | null>(null);

  const EMAIL_DOMAIN_RE = /^[a-z0-9._%+-]+@up\.edu\.ph$/i;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);

    const trimmedEmail = email.trim();
    if (!EMAIL_DOMAIN_RE.test(trimmedEmail)) {
      setError("Please enter a valid institutional email ending in @up.edu.ph");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("get_released_score", {
      p_access_code: passkey.trim().toUpperCase(),
      p_student_email: trimmedEmail,
    });
    setLoading(false);

    if (rpcError) {
      setError(rpcError.message.replace(/^.*?:\s*/, ""));
      return;
    }

    setResult(data as ScoreResult);
  }

  if (result) {
    const pct =
      result.score !== null && result.score !== undefined && result.max_score
        ? Math.round((result.score / result.max_score) * 100)
        : null;
    return (
      <div className="space-y-5">
        <div className="text-center">
          <h2 className="text-lg font-semibold">{result.quiz_title}</h2>
          <p className="text-sm text-slate-500 mt-1">{result.student_name}</p>
          <p className="mt-3 text-3xl font-bold">
            {result.score ?? 0} / {result.max_score ?? 0}
            {pct !== null && (
              <span className="text-base font-normal text-slate-400 ml-2">({pct}%)</span>
            )}
          </p>
          {result.has_pending_essay && (
            <p className="text-sm text-amber-600 mt-2">
              Some essay answers are still being graded — your score may change.
            </p>
          )}
        </div>

        <div className="space-y-3">
          {result.questions.map((q, i) => (
            <div key={q.id} className="border border-slate-200 rounded-lg p-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">
                  Q{i + 1}. {q.prompt}
                </p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                    q.student_answer?.is_correct === true
                      ? "bg-emerald-100 text-emerald-700"
                      : q.student_answer?.is_correct === false
                      ? "bg-red-100 text-red-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {q.student_answer?.points_awarded ?? 0} / {q.points} pt
                </span>
              </div>
              <p className="mt-1 text-slate-700">
                <span className="text-slate-400">Your answer: </span>
                {studentAnswerText(q)}
              </p>
              {correctAnswerText(q) !== null && (
                <p className="text-slate-500 text-xs mt-0.5">
                  Correct answer: {correctAnswerText(q)}
                </p>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setResult(null)}
          className="w-full border border-slate-300 rounded-md py-2.5 text-sm font-medium hover:bg-slate-100"
        >
          Check another score
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-500 mb-1">
          Passkey <span className="text-slate-400">(from your instructor)</span>
        </label>
        <input
          required
          value={passkey}
          onChange={(e) => setPasskey(e.target.value)}
          className="w-full text-center tracking-widest uppercase rounded-md border border-slate-300 px-3 py-3 text-lg font-mono"
          placeholder="e.g. AB3K9Z"
          maxLength={12}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-500 mb-1">
          Institutional email <span className="text-slate-400">(@up.edu.ph)</span>
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          pattern="^[a-zA-Z0-9._%+-]+@up\.edu\.ph$"
          title="Must be a valid @up.edu.ph email address"
          className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base"
          placeholder="juan.delacruz@up.edu.ph"
        />
      </div>

      {error && <p className="text-base text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-slate-900 text-white rounded-md py-3 text-base font-medium hover:bg-slate-700 disabled:opacity-60"
      >
        {loading ? "Checking…" : "Check my score"}
      </button>
    </form>
  );
}
