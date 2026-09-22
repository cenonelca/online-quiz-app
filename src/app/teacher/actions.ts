"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { generateAccessCode } from "@/lib/access-code";
import type { Answer, Attempt, Question, QuestionType, Quiz } from "@/lib/types";
import {
  VALID_TYPES,
  parseQuestionTemplateText,
  type LabeledRecord,
  type RawQuestionRecord,
} from "@/lib/import-template";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function createQuiz() {
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("quizzes")
    .insert({ teacher_id: user.id, title: "Untitled quiz", description: "" })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Could not create quiz");
  }

  revalidatePath("/teacher");
  redirect(`/teacher/quizzes/${data.id}`);
}

export async function updateQuizSettings(quizId: string, formData: FormData) {
  const { supabase } = await requireUser();

  const title = String(formData.get("title") || "Untitled quiz").trim();
  const description = String(formData.get("description") || "").trim();
  const time_limit_mode = String(formData.get("time_limit_mode") || "whole_quiz");
  const rawMinutes = formData.get("time_limit_minutes");
  const time_limit_seconds =
    time_limit_mode === "whole_quiz" && rawMinutes
      ? Math.max(1, Math.round(Number(rawMinutes) * 60))
      : null;
  const shuffle_questions = formData.get("shuffle_questions") === "on";
  const shuffle_choices = formData.get("shuffle_choices") === "on";
  const require_fullscreen = formData.get("require_fullscreen") === "on";
  const max_attempts = Math.max(1, Number(formData.get("max_attempts") || 1));

  const { error } = await supabase
    .from("quizzes")
    .update({
      title,
      description,
      time_limit_mode,
      time_limit_seconds,
      shuffle_questions,
      shuffle_choices,
      require_fullscreen,
      max_attempts,
    })
    .eq("id", quizId);

  if (error) throw new Error(error.message);

  revalidatePath(`/teacher/quizzes/${quizId}`);
  revalidatePath("/teacher");
}

export async function togglePublish(quizId: string, publish: boolean) {
  const { supabase } = await requireUser();

  const update: Record<string, unknown> = { is_published: publish };

  if (publish) {
    const { data: current } = await supabase
      .from("quizzes")
      .select("access_code")
      .eq("id", quizId)
      .single();
    if (!current?.access_code) {
      update.access_code = generateAccessCode();
    }
  }

  const { error } = await supabase.from("quizzes").update(update).eq("id", quizId);
  if (error) throw new Error(error.message);

  revalidatePath(`/teacher/quizzes/${quizId}`);
  revalidatePath("/teacher");
}

export async function deleteQuiz(quizId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("quizzes").delete().eq("id", quizId);
  if (error) throw new Error(error.message);
  revalidatePath("/teacher");
  redirect("/teacher");
}

/**
 * "Roll over" a quiz into a brand-new quiz with a different title: copies the
 * source quiz's settings, questions, and (for multiple_choice) choices, but
 * leaves attempts/results behind and starts the new quiz unpublished with no
 * access code, so the instructor can review it before sharing it with a new
 * class/term.
 */
export async function rolloverQuiz(
  quizId: string,
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const { supabase, user } = await requireUser();

  const newTitle = String(formData.get("title") || "").trim();
  if (!newTitle) {
    return { error: "Please enter a title for the new quiz." };
  }

  const { data: source } = await supabase
    .from("quizzes")
    .select("*")
    .eq("id", quizId)
    .single<Quiz>();
  if (!source) return { error: "Source quiz not found." };

  const { data: sourceQuestions } = await supabase
    .from("questions")
    .select("*, choices(*)")
    .eq("quiz_id", quizId)
    .order("order_index", { ascending: true })
    .returns<Question[]>();

  const { data: newQuiz, error: quizError } = await supabase
    .from("quizzes")
    .insert({
      teacher_id: user.id,
      title: newTitle,
      description: source.description,
      time_limit_mode: source.time_limit_mode,
      time_limit_seconds: source.time_limit_seconds,
      shuffle_questions: source.shuffle_questions,
      shuffle_choices: source.shuffle_choices,
      require_fullscreen: source.require_fullscreen,
      max_attempts: source.max_attempts,
      is_published: false,
    })
    .select("id")
    .single();

  if (quizError || !newQuiz) {
    return { error: quizError?.message || "Could not create the new quiz." };
  }

  for (const q of sourceQuestions || []) {
    const { data: newQuestion, error: qErr } = await supabase
      .from("questions")
      .insert({
        quiz_id: newQuiz.id,
        type: q.type,
        prompt: q.prompt,
        points: q.points,
        time_limit_seconds: q.time_limit_seconds,
        order_index: q.order_index,
        correct_boolean: q.correct_boolean,
        identification_answers: q.identification_answers,
        identification_case_sensitive: q.identification_case_sensitive,
        numerical_answer: q.numerical_answer,
        numerical_tolerance: q.numerical_tolerance,
      })
      .select("id")
      .single();

    if (qErr || !newQuestion) continue;

    if (q.type === "multiple_choice" && q.choices?.length) {
      await supabase.from("choices").insert(
        q.choices.map((c) => ({
          question_id: newQuestion.id,
          text: c.text,
          is_correct: c.is_correct,
          order_index: c.order_index,
        }))
      );
    }
  }

  revalidatePath("/teacher");
  redirect(`/teacher/quizzes/${newQuiz.id}`);
}

export async function addQuestion(quizId: string, type: string) {
  const { supabase } = await requireUser();

  const { count } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("quiz_id", quizId);

  const base: {
    quiz_id: string;
    type: string;
    prompt: string;
    points: number;
    order_index: number;
    correct_boolean?: boolean;
  } = {
    quiz_id: quizId,
    type,
    prompt: "",
    points: 1,
    order_index: count ?? 0,
  };
  if (type === "true_false") base.correct_boolean = true;

  const { data, error } = await supabase
    .from("questions")
    .insert(base)
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  if (type === "multiple_choice" && data) {
    await supabase.from("choices").insert([
      { question_id: data.id, text: "", order_index: 0, is_correct: true },
      { question_id: data.id, text: "", order_index: 1, is_correct: false },
    ]);
  }

  revalidatePath(`/teacher/quizzes/${quizId}`);
}

export async function deleteQuestion(quizId: string, questionId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("questions").delete().eq("id", questionId);
  if (error) throw new Error(error.message);
  revalidatePath(`/teacher/quizzes/${quizId}`);
}

export async function updateQuestion(
  quizId: string,
  questionId: string,
  formData: FormData
) {
  const { supabase } = await requireUser();

  const type = String(formData.get("type"));
  const prompt = String(formData.get("prompt") || "").trim();
  const points = Math.max(0, Number(formData.get("points") || 1));
  const rawTime = formData.get("time_limit_seconds");
  const time_limit_seconds = rawTime ? Math.max(5, Number(rawTime)) : null;

  const update: Record<string, unknown> = { prompt, points, time_limit_seconds };

  if (type === "true_false") {
    update.correct_boolean = formData.get("correct_boolean") === "true";
  } else if (type === "identification") {
    const raw = String(formData.get("identification_answers") || "");
    update.identification_answers = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    update.identification_case_sensitive =
      formData.get("identification_case_sensitive") === "on";
  } else if (type === "numerical") {
    update.numerical_answer = Number(formData.get("numerical_answer") || 0);
    update.numerical_tolerance = Number(formData.get("numerical_tolerance") || 0);
  }

  const { error } = await supabase.from("questions").update(update).eq("id", questionId);
  if (error) throw new Error(error.message);

  if (type === "multiple_choice") {
    const choiceIds = formData.getAll("choice_id") as string[];
    const choiceTexts = formData.getAll("choice_text") as string[];
    const correctId = String(formData.get("correct_choice_id") || "");

    for (let i = 0; i < choiceIds.length; i++) {
      await supabase
        .from("choices")
        .update({ text: choiceTexts[i], is_correct: choiceIds[i] === correctId, order_index: i })
        .eq("id", choiceIds[i]);
    }
  }

  revalidatePath(`/teacher/quizzes/${quizId}`);
}

export async function addChoice(quizId: string, questionId: string) {
  const { supabase } = await requireUser();
  const { count } = await supabase
    .from("choices")
    .select("id", { count: "exact", head: true })
    .eq("question_id", questionId);

  const { error } = await supabase
    .from("choices")
    .insert({ question_id: questionId, text: "", order_index: count ?? 0 });
  if (error) throw new Error(error.message);
  revalidatePath(`/teacher/quizzes/${quizId}`);
}

export async function deleteChoice(quizId: string, choiceId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("choices").delete().eq("id", choiceId);
  if (error) throw new Error(error.message);
  revalidatePath(`/teacher/quizzes/${quizId}`);
}

export async function reorderQuestions(quizId: string, orderedIds: string[]) {
  const { supabase } = await requireUser();
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("questions").update({ order_index: index }).eq("id", id)
    )
  );
  revalidatePath(`/teacher/quizzes/${quizId}`);
}

export async function gradeEssay(
  quizId: string,
  answerId: string,
  points: number,
  maxPoints: number
) {
  const { supabase } = await requireUser();
  const awarded = Math.max(0, Math.min(points, maxPoints));
  const { error } = await supabase
    .from("answers")
    .update({ points_awarded: awarded, is_correct: awarded >= maxPoints })
    .eq("id", answerId);
  if (error) throw new Error(error.message);
  revalidatePath(`/teacher/quizzes/${quizId}/results`);
}

/**
 * Permanently deletes one student's attempt (answers and proctoring events
 * go with it via cascade). Use this to let a student who disconnected or
 * needs a redo rejoin under the same name without hitting the quiz's
 * max-attempts limit. This cannot be undone.
 */
export async function deleteAttempt(quizId: string, attemptId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("delete_attempt", {
    p_attempt_id: attemptId,
  });
  if (error) return { error: error.message };
  revalidatePath(`/teacher/quizzes/${quizId}/results`);
  return { success: "Attempt deleted." };
}

/**
 * "Release" a quiz's scores: once released, students can look up their own
 * graded score (and the full answer key) on the student site's
 * /check-score page via `get_released_score`, keyed by their passkey +
 * institutional email. Toggleable so an instructor can hide scores again
 * (e.g. to fix a grading mistake) before re-releasing.
 */
export async function setScoresReleased(quizId: string, released: boolean) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("quizzes")
    .update({ scores_released_at: released ? new Date().toISOString() : null })
    .eq("id", quizId);
  if (error) return { error: error.message };
  revalidatePath(`/teacher/quizzes/${quizId}/results`);
  return {
    success: released
      ? "Scores released — students can now check their score."
      : "Scores hidden from students again.",
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatStudentAnswer(q: Question, a?: Answer): string {
  if (!a) return "No answer";
  switch (q.type) {
    case "true_false":
      return a.boolean_answer === null || a.boolean_answer === undefined
        ? "No answer"
        : a.boolean_answer
        ? "True"
        : "False";
    case "multiple_choice": {
      const choice = q.choices?.find((c) => c.id === a.choice_id);
      return choice?.text || "No answer";
    }
    case "identification":
      return a.text_answer || "No answer";
    case "numerical":
      return a.numerical_answer !== null && a.numerical_answer !== undefined
        ? String(a.numerical_answer)
        : "No answer";
    case "essay":
      return a.text_answer || "No answer";
    default:
      return "No answer";
  }
}

function formatCorrectAnswer(q: Question): string | null {
  switch (q.type) {
    case "true_false":
      return q.correct_boolean ? "True" : "False";
    case "multiple_choice":
      return q.choices?.find((c) => c.is_correct)?.text || "—";
    case "identification":
      return (q.identification_answers || []).join(" / ");
    case "numerical":
      return `${q.numerical_answer} ± ${q.numerical_tolerance}`;
    case "essay":
      return null;
    default:
      return null;
  }
}

/** Builds the score+answer-key email body for one student's graded attempt. */
function buildScoreEmailHtml(
  quiz: Quiz,
  questions: Question[],
  attempt: Attempt & { answers: Answer[] }
): string {
  const byQuestion = new Map((attempt.answers || []).map((a) => [a.question_id, a]));
  const maxScore = questions.reduce((s, q) => s + Number(q.points || 0), 0);

  const rows = questions
    .map((q, i) => {
      const a = byQuestion.get(q.id);
      const studentAnswer = formatStudentAnswer(q, a);
      const correctAnswer = formatCorrectAnswer(q);
      const awarded = a?.points_awarded ?? 0;
      const marker =
        a?.is_correct === true
          ? "✓"
          : a?.needs_manual_grade && a?.is_correct === null
          ? "(pending review)"
          : a?.is_correct === false
          ? "✗"
          : "—";
      return `
        <tr>
          <td style="padding:8px 4px;border-bottom:1px solid #e2e8f0;vertical-align:top;">
            <div style="font-weight:600;">Q${i + 1}. ${escapeHtml(q.prompt)}</div>
            <div style="color:#475569;font-size:13px;margin-top:4px;">Your answer: ${escapeHtml(
              studentAnswer
            )}</div>
            ${
              correctAnswer !== null
                ? `<div style="color:#475569;font-size:13px;">Correct answer: ${escapeHtml(
                    correctAnswer
                  )}</div>`
                : ""
            }
          </td>
          <td style="padding:8px 4px;border-bottom:1px solid #e2e8f0;text-align:right;white-space:nowrap;vertical-align:top;">
            ${marker} ${awarded}/${q.points}
          </td>
        </tr>`;
    })
    .join("");

  return `
    <div style="font-family:sans-serif;color:#0f172a;max-width:600px;">
      <h2 style="margin-bottom:4px;">${escapeHtml(quiz.title || "Quiz")}</h2>
      <p style="margin-top:0;color:#475569;">Hi ${escapeHtml(attempt.student_name)},</p>
      <p style="font-size:18px;margin-bottom:20px;">
        <strong>Score: ${attempt.score ?? 0} / ${attempt.max_score ?? maxScore}</strong>
      </p>
      <table style="width:100%;border-collapse:collapse;">
        ${rows}
      </table>
    </div>
  `;
}

/**
 * Emails every student with a submitted/graded attempt and an institutional
 * email on file their score plus the full question-by-question answer key,
 * using Mailjet. Also releases the quiz's scores (if not already released)
 * so the same information stays available on the self-serve /check-score
 * page afterwards.
 */
export async function sendScoreEmails(quizId: string) {
  const { supabase } = await requireUser();

  const apiKey = process.env.MAILJET_API_KEY;
  const secretKey = process.env.MAILJET_SECRET_KEY;
  const fromEmail = process.env.MAILJET_FROM_EMAIL;
  if (!apiKey || !secretKey || !fromEmail) {
    return {
      error:
        "Email sending isn't set up yet — MAILJET_API_KEY, MAILJET_SECRET_KEY, and MAILJET_FROM_EMAIL need to be configured for this app.",
    };
  }

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("*")
    .eq("id", quizId)
    .single<Quiz>();
  if (!quiz) return { error: "Quiz not found." };

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
    .in("status", ["submitted", "graded"])
    .not("student_email", "is", null)
    .returns<(Attempt & { answers: Answer[] })[]>();

  if (!attempts || attempts.length === 0) {
    return { error: "No submitted attempts with a UP email on file yet." };
  }

  const authHeader = `Basic ${Buffer.from(`${apiKey}:${secretKey}`).toString(
    "base64"
  )}`;

  let sent = 0;
  const failed: string[] = [];

  for (const attempt of attempts) {
    if (!attempt.student_email) continue;
    const html = buildScoreEmailHtml(quiz, questions || [], attempt);
    try {
      const res = await fetch("https://api.mailjet.com/v3.1/send", {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Messages: [
            {
              From: { Email: fromEmail, Name: "Online Quiz with Timer" },
              To: [{ Email: attempt.student_email }],
              Subject: `Your score for "${quiz.title}"`,
              HTMLPart: html,
            },
          ],
        }),
      });
      const data = await res.json().catch(() => null);
      const status = data?.Messages?.[0]?.Status;
      if (res.ok && status === "success") {
        sent++;
      } else {
        failed.push(attempt.student_email);
      }
    } catch {
      failed.push(attempt.student_email);
    }
  }

  if (!quiz.scores_released_at) {
    await supabase
      .from("quizzes")
      .update({ scores_released_at: new Date().toISOString() })
      .eq("id", quizId);
  }

  revalidatePath(`/teacher/quizzes/${quizId}/results`);

  if (sent === 0) {
    return { error: `Could not send any emails. (${failed.length} failed)` };
  }
  return {
    success: `Emailed ${sent} student${sent === 1 ? "" : "s"}.${
      failed.length ? ` (${failed.length} failed: ${failed.join(", ")})` : ""
    }`,
  };
}

function cellString(row: ExcelJS.Row, col: number): string {
  const v = row.getCell(col).value;
  if (v === null || v === undefined) return "";
  if (typeof v === "object" && "text" in (v as object)) {
    return String((v as { text: unknown }).text ?? "").trim();
  }
  if (typeof v === "object" && "richText" in (v as object)) {
    const rt = (v as { richText: { text: string }[] }).richText;
    return rt.map((r) => r.text).join("").trim();
  }
  return String(v).trim();
}

/**
 * Shared insert step for the teacher "Import questions" feature. Every
 * import format (.xlsx, .docx, .pdf) reduces to a list of `RawQuestionRecord`s
 * (see `@/lib/import-template`) and funnels through this one function, which
 * applies the same defaults/validation and does the actual Supabase writes
 * (questions, then choices for multiple_choice).
 *
 * `startOrderIndex` is the `order_index` to assign to the first record;
 * it is consumed (incremented) for every record that passes validation and
 * is attempted, whether or not the insert itself succeeds - matching the
 * original .xlsx-only behavior.
 */
async function insertParsedQuestions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  quizId: string,
  startOrderIndex: number,
  records: LabeledRecord[]
): Promise<{ imported: number; errors: string[] }> {
  let orderIndex = startOrderIndex;
  let imported = 0;
  const errors: string[] = [];

  for (const { label, data } of records) {
    const type = data.type.toLowerCase() as QuestionType;

    if (!VALID_TYPES.includes(type)) {
      errors.push(`${label}: unknown type "${data.type}"`);
      continue;
    }
    if (!data.prompt) {
      errors.push(`${label}: missing prompt`);
      continue;
    }
    if (type === "multiple_choice" && (data.choices?.length ?? 0) < 2) {
      errors.push(`${label}: needs at least 2 choices`);
      continue;
    }

    const points = Number.isFinite(data.points) ? (data.points as number) : 1;

    const insert: Record<string, unknown> = {
      quiz_id: quizId,
      type,
      prompt: data.prompt,
      points,
      time_limit_seconds: data.time_limit_seconds ?? null,
      order_index: orderIndex++,
    };

    if (type === "true_false") {
      insert.correct_boolean = data.correct_boolean ?? true;
    } else if (type === "identification") {
      insert.identification_answers = data.identification_answers ?? [];
    } else if (type === "numerical") {
      insert.numerical_answer = Number.isFinite(data.numerical_answer)
        ? (data.numerical_answer as number)
        : 0;
      insert.numerical_tolerance = Number.isFinite(data.numerical_tolerance)
        ? (data.numerical_tolerance as number)
        : 0;
    }

    const { data: created, error: qErr } = await supabase
      .from("questions")
      .insert(insert)
      .select("id")
      .single();

    if (qErr || !created) {
      errors.push(`${label}: ${qErr?.message || "insert failed"}`);
      continue;
    }

    if (type === "multiple_choice") {
      const choiceRows = (data.choices ?? []).map((c, idx) => ({
        text: c.text,
        is_correct: c.is_correct,
        order_index: idx,
        question_id: created.id,
      }));
      await supabase.from("choices").insert(choiceRows);
    }

    imported++;
  }

  return { imported, errors };
}

/** Parse an uploaded .xlsx workbook into labeled RawQuestionRecords (unchanged behavior from before the docx/pdf support was added). */
async function parseXlsxImport(
  buffer: ArrayBuffer
): Promise<{ records: LabeledRecord[]; error?: string }> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch {
    return { records: [], error: "Could not read that file. Make sure it's a valid .xlsx file." };
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) return { records: [], error: "The workbook has no sheets." };

  const headerRow = sheet.getRow(1);
  const headers: Record<string, number> = {};
  headerRow.eachCell((cell, colNumber) => {
    const key = String(cell.value ?? "").trim().toLowerCase().replace(/\s+/g, "_");
    if (key) headers[key] = colNumber;
  });

  const required = ["type", "prompt"];
  for (const r of required) {
    if (!headers[r]) {
      return {
        records: [],
        error: `Missing required column "${r}". Download the template to check the format.`,
      };
    }
  }

  const records: LabeledRecord[] = [];

  for (let rowNum = 2; rowNum <= sheet.rowCount; rowNum++) {
    const row = sheet.getRow(rowNum);
    if (row.cellCount === 0) continue;
    const typeRaw = cellString(row, headers.type).toLowerCase();
    const prompt = cellString(row, headers.prompt);
    if (!typeRaw && !prompt) continue; // blank row

    const pointsRaw = headers.points ? cellString(row, headers.points) : "";
    const points = pointsRaw ? Number(pointsRaw) : 1;
    const timeLimitRaw = headers.time_limit_seconds
      ? cellString(row, headers.time_limit_seconds)
      : "";
    const time_limit_seconds = timeLimitRaw ? Number(timeLimitRaw) : null;

    const data: RawQuestionRecord = {
      type: typeRaw,
      prompt,
      points,
      time_limit_seconds,
    };

    if (typeRaw === "true_false") {
      const raw = headers.correct_boolean
        ? cellString(row, headers.correct_boolean).toLowerCase()
        : "true";
      data.correct_boolean = ["true", "t", "1", "yes"].includes(raw);
    } else if (typeRaw === "identification") {
      const raw = headers.identification_answers
        ? cellString(row, headers.identification_answers)
        : "";
      data.identification_answers = raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (typeRaw === "numerical") {
      data.numerical_answer = headers.numerical_answer
        ? Number(cellString(row, headers.numerical_answer) || 0)
        : 0;
      data.numerical_tolerance = headers.numerical_tolerance
        ? Number(cellString(row, headers.numerical_tolerance) || 0)
        : 0;
    } else if (typeRaw === "multiple_choice") {
      const choiceCols = ["choice1", "choice2", "choice3", "choice4", "choice5", "choice6"];
      const correctIdxRaw = headers.correct_choice
        ? cellString(row, headers.correct_choice)
        : "1";
      const correctIdx = Math.max(1, Number(correctIdxRaw) || 1);

      const choices: { text: string; is_correct: boolean }[] = [];
      choiceCols.forEach((colKey, idx) => {
        if (!headers[colKey]) return;
        const text = cellString(row, headers[colKey]);
        if (!text) return;
        choices.push({ text, is_correct: idx + 1 === correctIdx });
      });
      data.choices = choices;
    }

    records.push({ label: `Row ${rowNum}`, data });
  }

  return { records };
}

export async function importQuestions(
  quizId: string,
  _prev: { error?: string; success?: string },
  formData: FormData
): Promise<{ error?: string; success?: string }> {
  const { supabase } = await requireUser();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a .xlsx, .docx, or .pdf file to upload." };
  }

  const ext = (file.name || "").toLowerCase().split(".").pop() ?? "";
  const arrayBuffer = await file.arrayBuffer();

  let records: LabeledRecord[] = [];
  const parseErrors: string[] = [];

  if (ext === "xlsx") {
    const result = await parseXlsxImport(arrayBuffer);
    if (result.error) return { error: result.error };
    records = result.records;
  } else if (ext === "docx") {
    let text: string;
    try {
      // Imported dynamically (not at module scope) so that every page which
      // pulls in this "use server" file - including /teacher and the quiz
      // builder, which never touch file parsing - doesn't pay the cost of
      // loading mammoth, and can't be affected by any of its own module-init
      // side effects. Only actually evaluated when a .docx is uploaded.
      const mammoth = (await import("mammoth")).default;
      const result = await mammoth.extractRawText({ buffer: Buffer.from(arrayBuffer) });
      text = result.value;
    } catch {
      return { error: "Could not read that file. Make sure it's a valid .docx file." };
    }
    const parsed = parseQuestionTemplateText(text);
    records = parsed.records;
    parseErrors.push(...parsed.errors);
  } else if (ext === "pdf") {
    let text: string;
    try {
      // Dynamic import for the same reason as mammoth above - and critically
      // so here: pdf-parse pulls in a PDF.js build that references the
      // browser-only DOMMatrix global during module evaluation. A top-level
      // `import` at the file's top crashed EVERY /teacher request (even ones
      // having nothing to do with importing) with "DOMMatrix is not defined",
      // because Vercel's Node serverless runtime has no DOMMatrix. Deferring
      // the import to here means it's only evaluated when a .pdf is actually
      // uploaded, inside a try/catch that already handles failures. The
      // polyfill import (side-effect only) must run first, since pdf-parse
      // itself references `DOMMatrix` at module-evaluation time, not just
      // when rendering - text extraction alone still touches it.
      await import("@/lib/pdf-dom-polyfill");
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: Buffer.from(arrayBuffer) });
      const result = await parser.getText();
      await parser.destroy();
      text = result.text;
    } catch {
      return { error: "Could not read that file. Make sure it's a valid .pdf file." };
    }
    const parsed = parseQuestionTemplateText(text);
    records = parsed.records;
    parseErrors.push(...parsed.errors);
  } else {
    return { error: "Please upload a .xlsx, .docx, or .pdf file." };
  }

  const { count } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("quiz_id", quizId);

  const { imported, errors: insertErrors } = await insertParsedQuestions(
    supabase,
    quizId,
    count ?? 0,
    records
  );
  const errors = [...parseErrors, ...insertErrors];

  revalidatePath(`/teacher/quizzes/${quizId}`);

  if (imported === 0) {
    return { error: errors.length ? errors.slice(0, 5).join("; ") : "No questions found in file." };
  }

  return {
    success: `Imported ${imported} question${imported === 1 ? "" : "s"}.${
      errors.length ? ` (${errors.length} skipped)` : ""
    }`,
  };
}
