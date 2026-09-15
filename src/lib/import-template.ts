/**
 * Shared logic for the teacher "Import questions" feature.
 *
 * This module is intentionally free of Supabase / "use server" concerns so it
 * can be:
 *  - imported by the `.docx` and `.pdf` import routes in
 *    `src/app/teacher/actions.ts`,
 *  - imported by the three `/api/import-template*` routes that generate the
 *    downloadable templates, and
 *  - unit-tested / exercised directly from a plain Node script.
 *
 * ---------------------------------------------------------------------------
 * FIXED TEXT TEMPLATE FORMAT (used by both .docx and .pdf import)
 * ---------------------------------------------------------------------------
 * Both Word and PDF files are reduced to plain extracted text and run through
 * the same `parseQuestionTemplateText()` parser below. There is no AI/LLM
 * extraction involved - the format is a fixed, documented plain-text layout:
 *
 *   1) [TRUE_FALSE] The Earth revolves around the Sun.
 *   POINTS: 1
 *   ANSWER: TRUE
 *
 *   2) [MULTIPLE_CHOICE] Which of these is a primary color?
 *   POINTS: 2
 *   A) Red
 *   B) Green
 *   C) Orange
 *   D) Purple
 *   ANSWER: A
 *
 *   3) [IDENTIFICATION] What is the capital of the Philippines?
 *   POINTS: 1
 *   ANSWER: Manila, City of Manila
 *
 *   4) [NUMERICAL] What is 15% of 200?
 *   POINTS: 2
 *   ANSWER: 30
 *   TOLERANCE: 0.5
 *
 *   5) [ESSAY] Explain the law of diminishing marginal returns.
 *   POINTS: 5
 *   TIME_LIMIT: 300
 *
 * Rules:
 *  - A new question starts on a line matching `N) [TYPE] prompt text` (the
 *    number can be followed by "." or ")"). The type is case-insensitive and
 *    must be one of the QuestionType values.
 *  - Every line after that, up to the next numbered question (or end of
 *    document), belongs to that question:
 *      POINTS: <number>        -> points (default 1)
 *      TIME_LIMIT: <seconds>   -> time_limit_seconds (default none)
 *      ANSWER: <text>          -> meaning depends on the question type
 *      TOLERANCE: <number>     -> numerical_tolerance (default 0)
 *      A) ... F) <text>        -> multiple-choice options, in order
 *  - Blank lines are ignored.
 *  - A malformed question block (unknown type, missing prompt, or a
 *    multiple-choice block with fewer than 2 options) is skipped and reported
 *    as a parse error for that question only - it never aborts the rest of
 *    the import.
 */

import type { QuestionType } from "@/lib/types";

export const VALID_TYPES: QuestionType[] = [
  "true_false",
  "multiple_choice",
  "identification",
  "numerical",
  "essay",
];

/**
 * A normalized, not-yet-inserted question record. Produced by the xlsx row
 * parser and by `parseQuestionTemplateText()` alike, then handed to
 * `insertParsedQuestions()` (see `src/app/teacher/actions.ts`) which applies
 * defaults and inserts into `questions` (+ `choices` for multiple_choice).
 *
 * Fields left `undefined` fall back to the same defaults the original xlsx
 * import used (points -> 1, time_limit_seconds -> null, correct_boolean ->
 * true, identification_answers -> [], numerical_answer/tolerance -> 0).
 */
export interface RawQuestionRecord {
  /** Lowercased question type string; validated against VALID_TYPES. */
  type: string;
  prompt: string;
  points?: number;
  time_limit_seconds?: number | null;
  correct_boolean?: boolean;
  identification_answers?: string[];
  numerical_answer?: number;
  numerical_tolerance?: number;
  /** multiple_choice only: 2-6 options, in display order. */
  choices?: { text: string; is_correct: boolean }[];
}

export interface LabeledRecord {
  /** Human-readable location used in error messages, e.g. "Row 4" or "Question 2". */
  label: string;
  data: RawQuestionRecord;
}

export interface TemplateParseResult {
  records: LabeledRecord[];
  errors: string[];
}

const QUESTION_START_RE = /^\s*\d+[.)]\s*\[(\w+)\]\s*(.+)$/;
const MC_OPTION_RE = /^([A-Fa-f])\)\s*(.+)$/;
const POINTS_RE = /^POINTS:\s*(.+)$/i;
const TIME_LIMIT_RE = /^TIME_LIMIT:\s*(.+)$/i;
const ANSWER_RE = /^ANSWER:\s*(.+)$/i;
const TOLERANCE_RE = /^TOLERANCE:\s*(.+)$/i;

/**
 * Parse plain text (already extracted from a .docx or .pdf file) using the
 * fixed template format documented above.
 */
export function parseQuestionTemplateText(text: string): TemplateParseResult {
  const errors: string[] = [];
  const records: LabeledRecord[] = [];

  interface Block {
    index: number;
    typeRaw: string;
    prompt: string;
    lines: string[];
  }
  const blocks: Block[] = [];
  let current: Block | null = null;

  for (const rawLine of text.split(/\r\n|\r|\n/)) {
    const line = rawLine.trim();
    if (!line) continue; // skip blank lines

    const startMatch = line.match(QUESTION_START_RE);
    if (startMatch) {
      current = {
        index: blocks.length + 1,
        typeRaw: startMatch[1],
        prompt: startMatch[2].trim(),
        lines: [],
      };
      blocks.push(current);
    } else if (current) {
      current.lines.push(line);
    }
    // Lines encountered before the first numbered question (e.g. a title)
    // are ignored.
  }

  for (const block of blocks) {
    const label = `Question ${block.index}`;
    const type = block.typeRaw.toLowerCase();

    if (!VALID_TYPES.includes(type as QuestionType)) {
      errors.push(`${label}: unknown type "${block.typeRaw}"`);
      continue;
    }
    if (!block.prompt) {
      errors.push(`${label}: missing prompt`);
      continue;
    }

    let points: number | undefined;
    let timeLimit: number | undefined;
    let answerRaw: string | undefined;
    let tolerance: number | undefined;
    const mcOptions: { letter: string; text: string }[] = [];

    for (const line of block.lines) {
      let m: RegExpMatchArray | null;
      if ((m = line.match(POINTS_RE))) {
        points = Number(m[1].trim());
      } else if ((m = line.match(TIME_LIMIT_RE))) {
        timeLimit = Number(m[1].trim());
      } else if ((m = line.match(TOLERANCE_RE))) {
        tolerance = Number(m[1].trim());
      } else if ((m = line.match(ANSWER_RE))) {
        answerRaw = m[1].trim();
      } else if ((m = line.match(MC_OPTION_RE))) {
        mcOptions.push({ letter: m[1].toUpperCase(), text: m[2].trim() });
      }
    }

    const data: RawQuestionRecord = {
      type,
      prompt: block.prompt,
      points: Number.isFinite(points) ? points : undefined,
      time_limit_seconds: Number.isFinite(timeLimit) ? timeLimit : undefined,
    };

    if (type === "true_false") {
      if (answerRaw !== undefined) {
        data.correct_boolean = ["true", "t", "1", "yes"].includes(answerRaw.toLowerCase());
      }
    } else if (type === "identification") {
      if (answerRaw !== undefined) {
        data.identification_answers = answerRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }
    } else if (type === "numerical") {
      if (answerRaw !== undefined) {
        const n = Number(answerRaw);
        if (Number.isFinite(n)) data.numerical_answer = n;
      }
      if (tolerance !== undefined && Number.isFinite(tolerance)) {
        data.numerical_tolerance = tolerance;
      }
    } else if (type === "multiple_choice") {
      if (mcOptions.length < 2) {
        errors.push(`${label}: needs at least 2 options (A), B), ...)`);
        continue;
      }
      const letters = mcOptions.map((o) => o.letter);
      let answerLetter = (answerRaw ?? "").toUpperCase();
      if (!letters.includes(answerLetter)) answerLetter = letters[0];
      data.choices = mcOptions.map((o) => ({
        text: o.text,
        is_correct: o.letter === answerLetter,
      }));
    }

    records.push({ label, data });
  }

  return { records, errors };
}

/**
 * The canonical set of 5 example questions (one per QuestionType), rendered
 * in the fixed text template format. Used to build the downloadable .docx
 * and .pdf templates, and mirrors the example rows in the .xlsx template
 * generated by `/api/import-template`.
 */
export const TEMPLATE_EXAMPLE_TEXT = `1) [TRUE_FALSE] The Earth revolves around the Sun.
POINTS: 1
ANSWER: TRUE

2) [MULTIPLE_CHOICE] Which of these is a primary color?
POINTS: 2
A) Red
B) Green
C) Orange
D) Purple
ANSWER: A

3) [IDENTIFICATION] What is the capital of the Philippines?
POINTS: 1
ANSWER: Manila, City of Manila

4) [NUMERICAL] What is 15% of 200?
POINTS: 2
ANSWER: 30
TOLERANCE: 0.5

5) [ESSAY] Explain the law of diminishing marginal returns.
POINTS: 5
TIME_LIMIT: 300
`;

/** `TEMPLATE_EXAMPLE_TEXT` split into lines (blank lines included as ""), handy for paragraph-per-line generators (docx/pdf). */
export const TEMPLATE_EXAMPLE_LINES: string[] = TEMPLATE_EXAMPLE_TEXT.split("\n");
