"use client";

import { useState, useTransition } from "react";
import { togglePublish } from "@/app/teacher/actions";
import type { Quiz } from "@/lib/types";

export default function PublishControl({
  quiz,
  questionCount,
}: {
  quiz: Quiz;
  questionCount: number;
}) {
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  // Students get a separate site/domain from instructors (see proxy.ts /
  // NEXT_PUBLIC_STUDENT_SITE_URL). Fall back to this site's own origin only
  // when that hasn't been configured (e.g. local dev).
  const studentBase =
    process.env.NEXT_PUBLIC_STUDENT_SITE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const link = quiz.access_code ? `${studentBase}/join?code=${quiz.access_code}` : "";

  return (
    <section className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-semibold">
            {quiz.is_published ? "Published — students can take this quiz" : "Draft"}
          </h2>
          {!quiz.is_published && questionCount === 0 && (
            <p className="text-sm text-amber-600 mt-1">
              Add at least one question before publishing.
            </p>
          )}
        </div>
        <button
          disabled={pending || (!quiz.is_published && questionCount === 0)}
          onClick={() =>
            startTransition(() => togglePublish(quiz.id, !quiz.is_published))
          }
          className={`rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 ${
            quiz.is_published
              ? "border border-slate-300 hover:bg-slate-100"
              : "bg-emerald-600 text-white hover:bg-emerald-500"
          }`}
        >
          {pending
            ? "Working…"
            : quiz.is_published
            ? "Unpublish"
            : "Publish quiz"}
        </button>
      </div>

      {quiz.is_published && quiz.access_code && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <code className="bg-slate-100 rounded-md px-3 py-2 text-sm flex-1 min-w-0 truncate">
            {link}
          </code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(link);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="text-sm border border-slate-300 rounded-md px-3 py-2 hover:bg-slate-100"
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
          <span className="text-sm text-slate-500">
            Quiz code: <span className="font-mono font-medium">{quiz.access_code}</span>
          </span>
        </div>
      )}
    </section>
  );
}
