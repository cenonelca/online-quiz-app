"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup } from "@/app/(auth)/actions";

type State = { error?: string; notice?: string };

export default function SignupPage() {
  const [state, formAction, pending] = useActionState<State, FormData>(
    async (_prev, formData) => (await signup(formData)) || {},
    {}
  );

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Link href="/" className="font-semibold text-xl">
            QuizTime
          </Link>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold">Create your professor account</h1>
        </div>
        <form action={formAction} className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Full name</label>
            <input
              name="fullName"
              type="text"
              required
              autoComplete="name"
              placeholder="Dr. Jane Santos"
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base"
            />
          </div>
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
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base"
            />
            <p className="mt-1 text-sm text-slate-500">At least 8 characters.</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Faculty signup key</label>
            <input
              name="masterKey"
              type="password"
              required
              autoComplete="off"
              placeholder="Provided by your department admin"
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base"
            />
            <p className="mt-1 text-sm text-slate-500">
              This keeps student self-registration as an instructor from happening. Ask
              your administrator for the key.
            </p>
          </div>
          {state.error && (
            <p className="text-base text-red-600">{state.error}</p>
          )}
          {state.notice && (
            <p className="text-base text-emerald-700">{state.notice}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full bg-slate-900 text-white rounded-md py-2.5 text-base font-medium hover:bg-slate-700 disabled:opacity-60"
          >
            {pending ? "Creating account…" : "Sign up"}
          </button>
        </form>
        <p className="mt-4 text-center text-base text-slate-600">
          Already have an account?{" "}
          <Link href="/login" className="text-slate-900 font-medium underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
