import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Question, Quiz } from "@/lib/types";
import AttemptRow, { type AttemptWithAnswers } from "./AttemptRow";
import ScoreActions from "./ScoreActions";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("*")
    .eq("id", id)
    .single<Quiz>();

  if (!quiz) notFound();

  const { data: questions } = await supabase
    .from("questions")
    .select("*, choices(*)")
    .eq("quiz_id", id)
    .order("order_index", { ascending: true })
    .returns<Question[]>();

  const { data: attempts } = await supabase
    .from("attempts")
    .select("*, answers(*), proctoring_events(count)")
    .eq("quiz_id", id)
    .order("started_at", { ascending: false })
    .returns<AttemptWithAnswers[]>();

  const submitted = (attempts || []).filter((a) => a.submitted_at);
  const scores = submitted
    .map((a) => a.score)
    .filter((s): s is number => s !== null && s !== undefined);
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const high = scores.length ? Math.max(...scores) : null;
  const low = scores.length ? Math.min(...scores) : null;
  const maxScore = questions?.reduce((s, q) => s + Number(q.points || 0), 0) ?? 0;

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link
            href={`/teacher/quizzes/${quiz.id}`}
            className="text-sm text-slate-500 hover:underline"
          >
            ← {quiz.title || "Untitled quiz"}
          </Link>
          <h1 className="text-2xl font-bold mt-1">Results</h1>
        </div>
        <a
          href={`/api/export/${quiz.id}`}
          className="border border-slate-300 rounded-md px-4 py-2 text-sm font-medium hover:bg-slate-100"
        >
          Export to Excel
        </a>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Attempts" value={attempts?.length ?? 0} />
        <Stat label="Average" value={avg !== null ? `${avg.toFixed(1)} / ${maxScore}` : "—"} />
        <Stat label="Highest" value={high !== null ? `${high} / ${maxScore}` : "—"} />
        <Stat label="Lowest" value={low !== null ? `${low} / ${maxScore}` : "—"} />
      </div>

      <ScoreActions
        quizId={quiz.id}
        released={!!quiz.scores_released_at}
        checkScoreUrl={`${
          process.env.NEXT_PUBLIC_STUDENT_SITE_URL ||
          "https://online-quiz-0820-join.vercel.app"
        }/check-score?code=${quiz.access_code ?? ""}`}
      />

      {!attempts?.length ? (
        <div className="border border-dashed border-slate-300 rounded-lg p-12 text-center text-slate-500">
          No student attempts yet. Share the quiz link to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {attempts.map((attempt) => (
            <AttemptRow
              key={attempt.id}
              quizId={quiz.id}
              attempt={attempt}
              questions={questions || []}
              maxScore={maxScore}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  );
}
