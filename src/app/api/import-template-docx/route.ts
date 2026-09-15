import { NextResponse } from "next/server";
import { Document, Packer, Paragraph } from "docx";
import { TEMPLATE_EXAMPLE_LINES } from "@/lib/import-template";

/**
 * Downloadable .docx template for the "Import questions" feature. Each line
 * of the fixed text template (see `@/lib/import-template`) becomes its own
 * paragraph, so `mammoth.extractRawText()` reads it back as plain text with
 * the same line breaks the parser expects.
 */
export async function GET() {
  const doc = new Document({
    sections: [
      {
        children: TEMPLATE_EXAMPLE_LINES.map((line) => new Paragraph(line)),
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="question_import_template.docx"`,
    },
  });
}
