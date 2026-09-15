import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createQuiz } from "./actions";

export default async function TeacherDashboard() {
  const supabase = await createClient();

  const { data: quizzes } = await supabase
    .from("quizzes")
    .select("id, title, is_published, access_code, created_at, questions(count), attempts(count)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Your quizzes</h1>
        <form action={createQuiz}>
          <button className="bg-slate-900 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-slate-700">
            + New quiz
          </button>
        </form>
      </div>

      {!quizzes?.length ? (
        <div className="border border-dashed border-slate-300 rounded-lg p-12 text-center text-slate-500">
          You haven&apos;t created a quiz yet.
        </div>
      ) : (
        <div className="grid gap-3">
          {quizzes.map((q) => {
            const qCount = (q.questions as { count: number }[])?.[0]?.count ?? 0;
            const aCount = (q.attempts as { count: number }[])?.[0]?.count ?? 0;
            return (
              <Link
                key={q.id}
                href={`/teacher/quizzes/${q.id}`}
                className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between hover:border-slate-400 transition-colors"
              >
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {q.title || "Untitled quiz"}
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        q.is_published
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {q.is_published ? "Published" : "Draft"}
                    </span>
                  </div>
                  <div className="text-sm text-slate-500 mt-1">
                    {qCount} question{qCount === 1 ? "" : "s"} · {aCount} attempt
                    {aCount === 1 ? "" : "s"}
                  </div>
                </div>
                <span className="text-slate-400 text-sm">Open →</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
