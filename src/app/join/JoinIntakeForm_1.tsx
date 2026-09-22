"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function JoinIntakeForm({
  initialCode = "",
  lockCode = false,
}: {
  initialCode?: string;
  lockCode?: boolean;
}) {
  const [passkey, setPasskey] = useState(initialCode);
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [course, setCourse] = useState("");
  const [section, setSection] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const EMAIL_DOMAIN_RE = /^[a-z0-9._%+-]+@up\.edu\.ph$/i;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const trimmedEmail = email.trim();
    if (!EMAIL_DOMAIN_RE.test(trimmedEmail)) {
      setError("Please enter a valid institutional email ending in @up.edu.ph");
      return;
    }

    setLoading(true);

    const code = passkey.trim().toUpperCase();
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("start_attempt", {
      p_access_code: code,
      p_last_name: lastName.trim(),
      p_first_name: firstName.trim(),
      p_student_email: trimmedEmail,
      p_middle_initial: null,
      p_course: course.trim() || null,
      p_section: section.trim() || null,
    });

    setLoading(false);

    if (rpcError) {
      setError(rpcError.message.replace(/^.*?:\s*/, ""));
      return;
    }

    router.push(`/take/${code}/attempt/${data.attempt_id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5 space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-500 mb-1">
          Passkey <span className="text-slate-400">(from your FIC)</span>
        </label>
        <input
          required
          value={passkey}
          onChange={(e) => setPasskey(e.target.value)}
          readOnly={lockCode}
          className={`w-full text-center tracking-widest uppercase rounded-md border border-slate-300 px-3 py-3 text-lg font-mono ${
            lockCode ? "bg-slate-50 text-slate-600" : ""
          }`}
          maxLength={12}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-500 mb-1">
            Last name
          </label>
          <input
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-500 mb-1">
            First name
          </label>
          <input
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-500 mb-1">
          Email <span className="text-slate-400">(@up.edu.ph)</span>
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          pattern="^[a-zA-Z0-9._%+-]+@up\.edu\.ph$"
          title="Must be a valid @up.edu.ph email address"
          className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-500 mb-1">
            Course
          </label>
          <input
            required
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-500 mb-1">
            Section
          </label>
          <input
            required
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-base"
          />
        </div>
      </div>

      {error && <p className="text-base text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-slate-900 text-white rounded-md py-3 text-base font-medium hover:bg-slate-700 disabled:opacity-60"
      >
        {loading ? "Starting…" : "Start quiz"}
      </button>
      <p className="text-sm text-slate-400 text-center">
        Once you start, the timer begins immediately and cannot be paused.
      </p>
    </form>
  );
}
