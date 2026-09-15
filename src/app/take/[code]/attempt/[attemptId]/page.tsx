"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useProctoring } from "./useProctoring";
import QuestionRenderer from "./QuestionRenderer";
import type {
  AttemptQuestionsResponse,
  CurrentAnswer,
  QuizMeta,
  RpcQuestion,
} from "./types";

type Phase = "loading" | "fullscreen-gate" | "in-progress" | "submitted" | "error";

function formatClock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export default function AttemptPage() {
  const params = useParams<{ code: string; attemptId: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [phase, setPhase] = useState<Phase>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [quizMeta, setQuizMeta] = useState<QuizMeta | null>(null);
  const [questions, setQuestions] = useState<RpcQuestion[]>([]);
  const [deadlineAt, setDeadlineAt] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, CurrentAnswer>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [result, setResult] = useState<{ score: number; max_score: number; has_pending_essay: boolean } | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);

  const submittedRef = useRef(false);
  const perQuestionStartRef = useRef<number>(Date.now());
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const { fullscreenExits, enterFullscreen, log } = useProctoring(
    params.attemptId,
    phase === "in-progress"
  );

  // Load quiz meta + attempt questions
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [{ data: meta }, { data: attemptData, error: attemptErr }] = await Promise.all([
        supabase
          .from("public_quiz_view")
          .select("title, time_limit_mode, time_limit_seconds, require_fullscreen")
          .eq("access_code", params.code.toUpperCase())
          .maybeSingle(),
        supabase.rpc("get_attempt_questions", { p_attempt_id: params.attemptId }),
      ]);

      if (cancelled) return;

      if (attemptErr || !attemptData) {
        setErrorMsg(
          attemptErr?.message?.includes("in progress")
            ? "This attempt has already been submitted."
            : "We couldn't load this quiz attempt."
        );
        setPhase("error");
        return;
      }

      const resp = attemptData as AttemptQuestionsResponse;
      setQuizMeta(meta as QuizMeta);
      setQuestions(resp.questions);
      setDeadlineAt(resp.deadline_at);

      const initialAnswers: Record<string, CurrentAnswer> = {};
      resp.questions.forEach((q) => {
        if (q.saved_answer) {
          initialAnswers[q.id] = {
            choice_id: q.saved_answer.choice_id,
            text_answer: q.saved_answer.text_answer,
            numerical_answer: q.saved_answer.numerical_answer,
            boolean_answer: q.saved_answer.boolean_answer,
          };
        }
      });
      setAnswers(initialAnswers);

      if (meta?.require_fullscreen) {
        setPhase("fullscreen-gate");
      } else {
        setPhase("in-progress");
      }
      perQuestionStartRef.current = Date.now();
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.attemptId, params.code]);

  // Ticking clock
  useEffect(() => {
    if (phase !== "in-progress") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [phase]);

  const submit = useCallback(
    async (auto: boolean) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      const { data, error } = await supabase.rpc("submit_attempt", {
        p_attempt_id: params.attemptId,
        p_auto_submitted: auto,
      });
      setSubmitting(false);
      if (error) {
        submittedRef.current = false;
        setErrorMsg(error.message);
        return;
      }
      setResult(data);
      setPhase("submitted");
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    },
    [params.attemptId, supabase]
  );

  const saveAnswer = useCallback(
    (questionId: string, next: CurrentAnswer, timeSpent?: number) => {
      supabase
        .rpc("save_answer", {
          p_attempt_id: params.attemptId,
          p_question_id: questionId,
          p_choice_id: next.choice_id ?? null,
          p_text_answer: next.text_answer ?? null,
          p_numerical_answer: next.numerical_answer ?? null,
          p_boolean_answer: next.boolean_answer ?? null,
          p_time_spent_seconds: timeSpent ?? null,
        })
        .then(() => {});
    },
    [params.attemptId, supabase]
  );

  function handleAnswerChange(question: RpcQuestion, next: CurrentAnswer) {
    setAnswers((prev) => ({ ...prev, [question.id]: { ...prev[question.id], ...next } }));
    clearTimeout(saveTimers.current[question.id]);
    saveTimers.current[question.id] = setTimeout(() => {
      saveAnswer(question.id, { ...answers[question.id], ...next });
    }, 500);
  }

  // Whole-quiz countdown
  const wholeQuizRemaining =
    quizMeta?.time_limit_mode === "whole_quiz" && deadlineAt
      ? (new Date(deadlineAt).getTime() - now) / 1000
      : null;

  useEffect(() => {
    if (wholeQuizRemaining !== null && wholeQuizRemaining <= 0 && phase === "in-progress") {
      submit(true);
    }
  }, [wholeQuizRemaining, phase, submit]);

  // Per-question countdown
  const currentQuestion = questions[currentIndex];
  const perQuestionSeconds = currentQuestion?.time_limit_seconds ?? null;
  const perQuestionRemaining =
    quizMeta?.time_limit_mode === "per_question" && perQuestionSeconds
      ? perQuestionSeconds - (now - perQuestionStartRef.current) / 1000
      : null;

  const goToNext = useCallback(() => {
    const q = questions[currentIndex];
    if (q) saveAnswer(q.id, answers[q.id] || {});
    if (currentIndex >= questions.length - 1) {
      submit(false);
    } else {
      setCurrentIndex((i) => i + 1);
      perQuestionStartRef.current = Date.now();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, questions, answers, saveAnswer, submit]);

  useEffect(() => {
    if (
      quizMeta?.time_limit_mode === "per_question" &&
      perQuestionRemaining !== null &&
      perQuestionRemaining <= 0 &&
      phase === "in-progress"
    ) {
      goToNext();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perQuestionRemaining, phase]);

  if (phase === "loading") {
    return <Centered>Loading quiz…</Centered>;
  }

  if (phase === "error") {
    return (
      <Centered>
        <p className="font-medium text-lg">{errorMsg}</p>
        <button
          onClick={() => router.push("/join")}
          className="mt-4 text-base underline"
        >
          Back to start
        </button>
      </Centered>
    );
  }

  if (phase === "fullscreen-gate") {
    return (
      <Centered>
        <h1 className="text-2xl font-bold mb-2">{quizMeta?.title}</h1>
        <p className="text-base text-slate-600 max-w-sm mx-auto">
          This quiz requires fullscreen mode. Leaving fullscreen during the quiz will be
          recorded. Click below to begin — the timer starts as soon as you enter
          fullscreen.
        </p>
        <button
          onClick={async () => {
            await enterFullscreen();
            setPhase("in-progress");
            perQuestionStartRef.current = Date.now();
          }}
          className="mt-5 bg-slate-900 text-white rounded-md px-5 py-3 text-base font-medium hover:bg-slate-700"
        >
          Enter fullscreen &amp; start
        </button>
      </Centered>
    );
  }

  if (phase === "submitted") {
    return (
      <Centered>
        <h1 className="text-2xl font-bold">Quiz submitted</h1>
        {result && !result.has_pending_essay && (
          <p className="mt-2 text-xl">
            Score: <span className="font-semibold">{result.score}</span> /{" "}
            {result.max_score}
          </p>
        )}
        {result?.has_pending_essay && (
          <p className="mt-2 text-base text-slate-600">
            Your objective questions are graded. Essay questions will be graded by
            your professor.
          </p>
        )}
        <p className="mt-4 text-base text-slate-500">You may now close this tab.</p>
      </Centered>
    );
  }

  // in-progress
  const isPerQuestion = quizMeta?.time_limit_mode === "per_question";

  return (
    <div
      className="min-h-screen pb-16"
      onDragStart={(e) => e.preventDefault()}
    >
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="mx-auto max-w-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <span className="font-medium text-base truncate">{quizMeta?.title}</span>
          <div className="flex items-center gap-2 sm:gap-3">
            {fullscreenExits > 0 && (
              <span className="text-sm text-amber-600">
                ⚠ Fullscreen exited {fullscreenExits}×
              </span>
            )}
            {wholeQuizRemaining !== null && (
              <TimerBadge seconds={wholeQuizRemaining} />
            )}
            {isPerQuestion && perQuestionRemaining !== null && (
              <TimerBadge seconds={perQuestionRemaining} />
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 mt-6 space-y-4">
        {isPerQuestion ? (
          currentQuestion && (
            <>
              <p className="text-sm text-slate-400">
                Question {currentIndex + 1} of {questions.length}
              </p>
              <QuestionRenderer
                question={currentQuestion}
                index={currentIndex}
                answer={answers[currentQuestion.id] || {}}
                onChange={(next) => handleAnswerChange(currentQuestion, next)}
              />
              <button
                onClick={goToNext}
                disabled={submitting}
                className="w-full bg-slate-900 text-white rounded-md py-3 text-base font-medium hover:bg-slate-700 disabled:opacity-60"
              >
                {currentIndex >= questions.length - 1 ? "Submit quiz" : "Next question →"}
              </button>
            </>
          )
        ) : (
          <>
            {questions.map((q, i) => (
              <QuestionRenderer
                key={q.id}
                question={q}
                index={i}
                answer={answers[q.id] || {}}
                onChange={(next) => handleAnswerChange(q, next)}
              />
            ))}
            <button
              onClick={() => {
                if (confirm("Submit your quiz now? You can't change answers after this.")) {
                  submit(false);
                }
              }}
              disabled={submitting}
              className="w-full bg-slate-900 text-white rounded-md py-3 text-base font-medium hover:bg-slate-700 disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit quiz"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function TimerBadge({ seconds }: { seconds: number }) {
  const urgent = seconds <= 30;
  return (
    <span
      className={`font-mono text-base px-3 py-1.5 rounded-md ${
        urgent ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"
      }`}
    >
      {formatClock(seconds)}
    </span>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">{children}</div>
    </main>
  );
}
