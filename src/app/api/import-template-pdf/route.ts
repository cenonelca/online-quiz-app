import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { TEMPLATE_EXAMPLE_TEXT } from "@/lib/import-template";

/**
 * Downloadable .pdf template for the "Import questions" feature, containing
 * the same fixed text template (see `@/lib/import-template`) that the .docx
 * template uses. The import action's PDF path (pdf-parse) extracts this back
 * to plain text and runs it through the same parser.
 */
export async function GET() {
  const buffer = await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.font("Helvetica").fontSize(11);
    for (const line of TEMPLATE_EXAMPLE_TEXT.split("\n")) {
      if (line.trim() === "") {
        doc.moveDown();
      } else {
        doc.text(line);
      }
    }

    doc.end();
  });

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="question_import_template.pdf"`,
    },
  });
}
