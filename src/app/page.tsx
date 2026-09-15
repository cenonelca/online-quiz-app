import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <span className="font-semibold text-lg">QuizTime</span>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/join" className="text-slate-600 hover:text-slate-900">
              I have a quiz code
            </Link>
            <Link
              href="/login"
              className="text-slate-600 hover:text-slate-900 px-3 py-1.5"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="bg-slate-900 text-white px-3 py-1.5 rounded-md hover:bg-slate-700"
            >
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      <section className="flex-1 mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          Timed quizzes for university courses
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Build a quiz with true/false, multiple choice, identification, numerical,
          and essay questions. Randomize order, set a countdown, share one link with
          your class, and get auto-graded results the moment students submit.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/signup"
            className="bg-slate-900 text-white px-5 py-2.5 rounded-md font-medium hover:bg-slate-700"
          >
            Create your first quiz
          </Link>
          <Link
            href="/join"
            className="border border-slate-300 px-5 py-2.5 rounded-md font-medium hover:bg-slate-100"
          >
            Enter a quiz code
          </Link>
        </div>

        <dl className="mt-16 grid grid-cols-2 sm:grid-cols-3 gap-6 text-left text-sm">
          {[
            ["Question types", "True/False, multiple choice, identification, numerical, essay"],
            ["Randomization", "Shuffle question and choice order per student"],
            ["Timing", "Whole-quiz or per-question countdown, auto-submit at zero"],
            ["Scoring", "Automatic grading, with manual grading for essays"],
            ["Results", "Per-student scores, time taken, and a class dashboard"],
            ["Anti-cheating", "Tab-switch detection, copy/paste blocking, fullscreen mode"],
          ].map(([title, desc]) => (
            <div key={title}>
              <dt className="font-medium text-slate-900">{title}</dt>
              <dd className="text-slate-600 mt-1">{desc}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
