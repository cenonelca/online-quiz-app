import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

export async function GET() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Questions");

  sheet.columns = [
    { header: "type", key: "type", width: 16 },
    { header: "prompt", key: "prompt", width: 40 },
    { header: "points", key: "points", width: 8 },
    { header: "time_limit_seconds", key: "time_limit_seconds", width: 18 },
    { header: "choice1", key: "choice1", width: 20 },
    { header: "choice2", key: "choice2", width: 20 },
    { header: "choice3", key: "choice3", width: 20 },
    { header: "choice4", key: "choice4", width: 20 },
    { header: "correct_choice", key: "correct_choice", width: 14 },
    { header: "correct_boolean", key: "correct_boolean", width: 16 },
    { header: "identification_answers", key: "identification_answers", width: 30 },
    { header: "numerical_answer", key: "numerical_answer", width: 16 },
    { header: "numerical_tolerance", key: "numerical_tolerance", width: 16 },
  ];
  sheet.getRow(1).font = { bold: true };

  sheet.addRows([
    {
      type: "true_false",
      prompt: "The Earth revolves around the Sun.",
      points: 1,
      correct_boolean: "TRUE",
    },
    {
      type: "multiple_choice",
      prompt: "Which of these is a primary color?",
      points: 2,
      choice1: "Red",
      choice2: "Green",
      choice3: "Orange",
      choice4: "Purple",
      correct_choice: 1,
    },
    {
      type: "identification",
      prompt: "What is the capital of the Philippines?",
      points: 1,
      identification_answers: "Manila, City of Manila",
    },
    {
      type: "numerical",
      prompt: "What is 15% of 200?",
      points: 2,
      numerical_answer: 30,
      numerical_tolerance: 0.5,
    },
    {
      type: "essay",
      prompt: "Explain the law of diminishing marginal returns.",
      points: 5,
      time_limit_seconds: 300,
    },
  ]);

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="question_import_template.xlsx"`,
    },
  });
}
