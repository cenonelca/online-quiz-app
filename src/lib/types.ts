export type QuestionType =
  | "true_false"
  | "multiple_choice"
  | "identification"
  | "numerical"
  | "essay";

export type TimeLimitMode = "whole_quiz" | "per_question" | "none";

export interface Choice {
  id: string;
  question_id?: string;
  text: string;
  is_correct?: boolean;
  order_index: number;
}

export interface Question {
  id: string;
  quiz_id?: string;
  type: QuestionType;
  prompt: string;
  points: number;
  time_limit_seconds: number | null;
  order_index: number;
  correct_boolean?: boolean | null;
  identification_answers?: string[] | null;
  identification_case_sensitive?: boolean;
  numerical_answer?: number | null;
  numerical_tolerance?: number;
  choices?: Choice[];
}

export interface Quiz {
  id: string;
  teacher_id?: string;
  title: string;
  description: string;
  time_limit_mode: TimeLimitMode;
  time_limit_seconds: number | null;
  shuffle_questions: boolean;
  shuffle_choices: boolean;
  is_published: boolean;
  access_code: string | null;
  require_fullscreen: boolean;
  max_attempts: number;
  available_from: string | null;
  available_until: string | null;
  scores_released_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Attempt {
  id: string;
  quiz_id: string;
  student_name: string;
  student_id_number: string | null;
  student_last_name?: string | null;
  student_first_name?: string | null;
  student_middle_initial?: string | null;
  student_email?: string | null;
  course?: string | null;
  section?: string | null;
  started_at: string;
  deadline_at: string | null;
  submitted_at: string | null;
  auto_submitted: boolean;
  status: "in_progress" | "submitted" | "graded";
  score: number | null;
  max_score: number | null;
}

export interface Answer {
  id: string;
  attempt_id: string;
  question_id: string;
  choice_id: string | null;
  text_answer: string | null;
  numerical_answer: number | null;
  boolean_answer: boolean | null;
  is_correct: boolean | null;
  points_awarded: number | null;
  needs_manual_grade: boolean;
  time_spent_seconds: number | null;
}

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  true_false: "True / False",
  multiple_choice: "Multiple Choice",
  identification: "Identification",
  numerical: "Numerical",
  essay: "Essay",
};
