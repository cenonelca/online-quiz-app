import type { QuestionType } from "@/lib/types";

export interface RpcChoice {
  id: string;
  text: string;
}

export interface SavedAnswer {
  choice_id: string | null;
  text_answer: string | null;
  numerical_answer: number | null;
  boolean_answer: boolean | null;
}

export interface RpcQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  points: number;
  time_limit_seconds: number | null;
  order_index: number;
  choices: RpcChoice[] | null;
  saved_answer: SavedAnswer | null;
}

export interface AttemptQuestionsResponse {
  attempt_id: string;
  deadline_at: string | null;
  questions: RpcQuestion[];
}

export interface QuizMeta {
  title: string;
  time_limit_mode: "whole_quiz" | "per_question" | "none";
  time_limit_seconds: number | null;
  require_fullscreen: boolean;
}

export interface CurrentAnswer {
  choice_id?: string | null;
  text_answer?: string | null;
  numerical_answer?: number | null;
  boolean_answer?: boolean | null;
}
