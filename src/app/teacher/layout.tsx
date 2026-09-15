import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/(auth)/actions";

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const name =
    (user?.user_metadata?.full_name as string | undefined) || user?.email;

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-3 flex items-center justify-between">
          <Link href="/teacher" className="font-semibold">
            QuizTime
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-600 hidden sm:inline">{name}</span>
            <form action={logout}>
              <button className="text-slate-600 hover:text-slate-900" type="submit">
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
