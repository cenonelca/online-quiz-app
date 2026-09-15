"use client";

import { useActionState } from "react";
import { setScoresReleased, sendScoreEmails } from "@/app/teacher/actions";

type ActionState = { error?: string; success?: string };

export default function ScoreActions({
  quizId,
  released,
  checkScoreUrl,
}: {
  quizId: string;
  released: boolean;
  checkScoreUrl: string;
}) {
  const [releaseState, releaseAction, releasePending] = useActionState<ActionState, FormData>(
    async () => (await setScoresReleased(quizId, !released)) || {},
    {}
  );
  const [emailState, emailAction, emailPending] = useActionState<ActionState, FormData>(
    async () => (await sendScoreEmails(quizId)) || {},
    {}
  );

  return (
    <section className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-semibold">
            {released ? "Scores released to students" : "Scores not released yet"}
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            {released
              ? "Students can look up their own score and the full answer key on the student site."
              : "Release scores so students can check them, or email each student their result directly."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <form action={releaseAction}>
            <button
              type="submit"
              disabled={releasePending}
              className={`text-sm rounded-md px-4 py-2 font-medium disabled:opacity-60 ${
                released
                  ? "border border-slate-300 hover:bg-slate-100"
                  : "bg-emerald-600 text-white hover:bg-emerald-500"
              }`}
            >
              {releasePending ? "Working…" : released ? "Unrelease scores" : "Release scores"}
            </button>
          </form>
          <form action={emailAction}>
            <button
              type="submit"
              disabled={emailPending}
              className="text-sm border border-slate-300 rounded-md px-4 py-2 font-medium hover:bg-slate-100 disabled:opacity-60"
            >
              {emailPending ? "Sending…" : "Email scores to students"}
            </button>
          </form>
        </div>
      </div>

      {released && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-500">Students check their score here:</span>
          <code className="bg-slate-100 rounded-md px-3 py-1.5 text-sm flex-1 min-w-0 truncate">
            {checkScoreUrl}
          </code>
        </div>
      )}

      {releaseState.error && <p className="text-sm text-red-600 mt-3">{releaseState.error}</p>}
      {releaseState.success && (
        <p className="text-sm text-emerald-600 mt-3">{releaseState.success}</p>
      )}
      {emailState.error && <p className="text-sm text-red-600 mt-3">{emailState.error}</p>}
      {emailState.success && <p className="text-sm text-emerald-600 mt-3">{emailState.success}</p>}
    </section>
  );
}
