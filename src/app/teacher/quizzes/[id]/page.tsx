import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { addQuestion, deleteQuiz } from "@/app/teacher/actions";
import QuizSettingsForm from "./QuizSettingsForm";
import PublishControl from "./PublishControl";
import QuestionCard from "./QuestionCard";
import ConfirmButton from "./ConfirmButton";
import ImportForm from "./ImportForm";
import RolloverForm from "./RolloverForm";
import type { Question, Quiz } from "@/lib/types";

export default async function QuizBuilderPage({
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

  const totalPoints = (questions || []).reduce((s, q) => s + Number(q.points || 0), 0);

  return (
    <div className="space-y-8 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/teacher" className="text-sm text-slate-500 hover:underline">
            ← All quizzes
          </Link>
          <h1 className="text-2xl font-bold mt-1">{quiz.title || "Untitled quiz"}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/teacher/quizzes/${quiz.id}/results`}
            className="border border-slate-300 rounded-md px-3 py-2 text-sm hover:bg-slate-100"
          >
            Results
          </Link>
        </div>
      </div>

      <PublishControl quiz={quiz} questionCount={questions?.length ?? 0} />

      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="font-semibold mb-4">Quiz settings</h2>
        <QuizSettingsForm quiz={quiz} />
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">
            Questions{" "}
            <span className="text-slate-400 font-normal text-sm">
              ({questions?.length ?? 0}, {totalPoints} pt{totalPoints === 1 ? "" : "s"} total)
            </span>
          </h2>
        </div>

        <div className="space-y-4">
          {(questions || []).map((q, idx) => (
            <QuestionCard key={q.id} quizId={quiz.id} question={q} index={idx} />
          ))}
        </div>

        <div className="mt-4 bg-white border border-dashed border-slate-300 rounded-lg p-4">
          <p className="text-sm text-slate-500 mb-3">Add a question:</p>
          <div className="flex flex-wrap gap-2">
            {[
              ["true_false", "True / False"],
              ["multiple_choice", "Multiple Choice"],
              ["identification", "Identification"],
              ["numerical", "Numerical"],
              ["essay", "Essay"],
            ].map(([type, label]) => (
              <form key={type} action={addQuestion.bind(null, quiz.id, type)}>
                <button className="text-sm border border-slate-300 rounded-md px-3 py-1.5 hover:bg-slate-100">
                  + {label}
                </button>
              </form>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <ImportForm quizId={quiz.id} />
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="font-semibold mb-2">Roll over to a new quiz</h2>
        <p className="text-sm text-slate-600 mb-3">
          Copy this quiz&apos;s questions and settings into a brand-new quiz under a
          different title (for a new term or section, for example). The new quiz
          starts as an unpublished draft with no attempts or results carried over.
        </p>
        <RolloverForm quizId={quiz.id} currentTitle={quiz.title || "Untitled quiz"} />
      </section>

      <section className="bg-white border border-red-200 rounded-lg p-5">
        <h2 className="font-semibold text-red-700 mb-2">Danger zone</h2>
        <p className="text-sm text-slate-600 mb-3">
          Deleting this quiz removes all questions and student attempts permanently.
        </p>
        <form action={deleteQuiz.bind(null, quiz.id)}>
          <ConfirmButton
            message="Delete this quiz and all of its results? This cannot be undone."
            className="text-sm border border-red-300 text-red-700 rounded-md px-3 py-1.5 hover:bg-red-50"
          >
            Delete quiz
          </ConfirmButton>
        </form>
      </section>
    </div>
  );
}
