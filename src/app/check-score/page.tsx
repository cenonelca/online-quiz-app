import Link from "next/link";
import CheckScoreForm from "./CheckScoreForm";

export default async function CheckScorePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const trimmedCode = (code || "").trim().toUpperCase();

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-4 text-center">
          <Link href="/" className="font-semibold text-xl">
            QuizTime
          </Link>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold">Check your score</h1>
          <p className="mt-1 text-base text-slate-600">
            Enter the quiz passkey and your institutional email to see your
            released score and answer key.
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <CheckScoreForm initialCode={trimmedCode} />
        </div>
      </div>
    </main>
  );
}
