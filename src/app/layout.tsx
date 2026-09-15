import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QuizTime — Timed Quizzes for Professors",
  description:
    "Create timed quizzes, share a link with your students, and get instant, auto-graded results.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
