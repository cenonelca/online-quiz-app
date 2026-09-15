import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import JoinIntakeForm from "./JoinIntakeForm";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const trimmedCode = (code || "").trim().toUpperCase();

  let quiz: { title: string; description: string | null; time_limit_mode: string; time_limit_seconds: number | null; require_fullscreen: boolean } | null = null;
  let notFound = false;

  if (trimmedCode) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("public_quiz_view")
      .select("*")
      .eq("access_code", trimmedCode)
      .maybeSingle();
    if (data) {
      quiz = data;
    } else {
      notFound = true;
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-4 text-center">
          <Link href="/" className="font-semibold text-xl">
            QuizTime
          </Link>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold">
            {quiz ? quiz.title : "Start your quiz"}
          </h1>
          {quiz?.description && (
            <p className="mt-2 text-base text-slate-600 whitespace-pre-wrap">
              {quiz.description}
            </p>
          )}
          {!quiz && (
            <p className="mt-1 text-base text-slate-600">
              Enter the passkey your instructor gave you, along with your name,
              course, and section.
            </p>
          )}
          {notFound && (
            <p className="mt-2 text-base text-red-600">
              That passkey didn&apos;t match a published quiz. Double-check it with
              your instructor, or type it in below.
            </p>
          )}
          {quiz && (
            <dl className="mt-3 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-500">
              {quiz.time_limit_mode === "whole_quiz" && quiz.time_limit_seconds && (
                <span>⏱ {Math.round(quiz.time_limit_seconds / 60)} minutes total</span>
              )}
              {quiz.time_limit_mode === "per_question" && <span>⏱ Timed per question</span>}
              {quiz.require_fullscreen && <span>🔒 Fullscreen required</span>}
            </dl>
          )}
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <JoinIntakeForm initialCode={trimmedCode} />
        </div>
        <p className="mt-4 text-center text-sm text-slate-500">
          Already took this quiz?{" "}
          <Link href="/check-score" className="underline hover:text-slate-700">
            Check your score
          </Link>
        </p>
      </div>
    </main>
  );
}
