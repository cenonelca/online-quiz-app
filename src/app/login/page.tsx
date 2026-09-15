"use client";

import Link from "next/link";
import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { login } from "@/app/(auth)/actions";

type State = { error?: string };

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/teacher";
  const [state, formAction, pending] = useActionState<State, FormData>(
    async (_prev, formData) => (await login(formData)) || {},
    {}
  );

  return (
    <form action={formAction} className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Password</label>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base"
        />
      </div>
      {state.error && <p className="text-base text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full bg-slate-900 text-white rounded-md py-2.5 text-base font-medium hover:bg-slate-700 disabled:opacity-60"
      >
        {pending ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Link href="/" className="font-semibold text-xl">
            QuizTime
          </Link>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold">Professor log in</h1>
        </div>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
        <p className="mt-4 text-center text-base text-slate-600">
          No account yet?{" "}
          <Link href="/signup" className="text-slate-900 font-medium underline">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
