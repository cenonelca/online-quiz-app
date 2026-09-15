import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import type { Answer, Attempt, Question, Quiz } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  const { quizId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("*")
    .eq("id", quizId)
    .single<Quiz>();

  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  const { data: questions } = await supabase
    .from("questions")
    .select("*, choices(*)")
    .eq("quiz_id", quizId)
    .order("order_index", { ascending: true })
    .returns<Question[]>();

  const { data: attempts } = await supabase
    .from("attempts")
    .select("*, answers(*)")
    .eq("quiz_id", quizId)
    .order("started_at", { ascending: true })
    .returns<(Attempt & { answers: Answer[] })[]>();

  const maxScore = (questions || []).reduce((s, q) => s + Number(q.points || 0), 0);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "QuizTime";
  workbook.created = new Date();

  // ---- Summary sheet ----
  const summary = workbook.addWorksheet("Summary");
  summary.columns = [
    { header: "Student name", key: "name", width: 26 },
    { header: "Course", key: "course", width: 14 },
    { header: "Section", key: "section", width: 12 },
    { header: "Student ID", key: "sid", width: 16 },
    { header: "Score", key: "score", width: 10 },
    { header: "Max score", key: "max", width: 10 },
    { header: "Percent", key: "pct", width: 10 },
    { header: "Status", key: "status", width: 14 },
    { header: "Auto-submitted", key: "auto", width: 14 },
    { header: "Started", key: "started", width: 20 },
    { header: "Submitted", key: "submitted", width: 20 },
    { header: "Time taken (min)", key: "duration", width: 16 },
  ];
  summary.getRow(1).font = { bold: true };

  for (const a of attempts || []) {
    const durationMin = a.submitted_at
      ? Math.round(
          ((new Date(a.submitted_at).getTime() - new Date(a.started_at).getTime()) /
            60000) *
            10
        ) / 10
      : null;
    summary.addRow({
      name: a.student_name,
      course: a.course || "",
      section: a.section || "",
      sid: a.student_id_number || "",
      score: a.score ?? "",
      max: maxScore,
      pct:
        a.score !== null && a.score !== undefined && maxScore > 0
          ? `${Math.round((a.score / maxScore) * 100)}%`
          : "",
      status: a.status,
      auto: a.auto_submitted ? "Yes" : "No",
      started: new Date(a.started_at).toLocaleString(),
      submitted: a.submitted_at ? new Date(a.submitted_at).toLocaleString() : "",
      duration: durationMin ?? "",
    });
  }

  // ---- Answer detail sheet ----
  const detail = workbook.addWorksheet("Answer Detail");
  const qCols = (questions || []).map((q, i) => ({
    header: `Q${i + 1} (${q.points}pt)`,
    key: `q_${q.id}`,
    width: 30,
  }));
  detail.columns = [
    { header: "Student name", key: "name", width: 26 },
    { header: "Course", key: "course", width: 14 },
    { header: "Section", key: "section", width: 12 },
    { header: "Student ID", key: "sid", width: 16 },
    ...qCols,
  ];
  detail.getRow(1).font = { bold: true };

  function answerText(q: Question, a: Answer | undefined) {
    if (!a) return "";
    switch (q.type) {
      case "true_false":
        return a.boolean_answer === null ? "" : a.boolean_answer ? "True" : "False";
      case "multiple_choice":
        return q.choices?.find((c) => c.id === a.choice_id)?.text || "";
      case "identification":
        return a.text_answer || "";
      case "numerical":
        return a.numerical_answer ?? "";
      case "essay":
        return a.text_answer || "";
      default:
        return "";
    }
  }

  for (const a of attempts || []) {
    const byQ = new Map(a.answers.map((ans) => [ans.question_id, ans]));
    const row: Record<string, string | number> = {
      name: a.student_name,
      course: a.course || "",
      section: a.section || "",
      sid: a.student_id_number || "",
    };
    for (const q of questions || []) {
      const ans = byQ.get(q.id);
      const text = answerText(q, ans);
      const mark =
        ans?.is_correct === true ? " ✓" : ans?.is_correct === false ? " ✗" : "";
      row[`q_${q.id}`] = `${text}${mark}`;
    }
    detail.addRow(row);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const filenameSafe = (quiz.title || "quiz").replace(/[^a-z0-9-_]+/gi, "_");

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filenameSafe}_results.xlsx"`,
    },
  });
}
