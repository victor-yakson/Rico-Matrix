import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import type { TextItem } from "pdfjs-dist/types/src/display/api";
import path from "path";
import { pathToFileURL } from "url";

export const extractPdfText = async (buffer: Buffer) => {
  const workerPath = path.join(
    process.cwd(),
    "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"
  );
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).toString();

  const data = new Uint8Array(buffer);
  const loadingTask = pdfjs.getDocument({
    data,
    disableWorker: true,
  } as any);
  const pdf = await loadingTask.promise;

  let text = "";
  for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ((item as TextItem).str ?? "").toString())
      .join(" ");
    text += ` ${pageText}`;
  }

  return text.trim();
};
