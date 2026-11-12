import { parseFm24Export, validateFm24Import } from "./fm24-pipe-parser";

interface ImportRequest {
  requestId: number;
  file: File;
}

const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<ImportRequest>) => void) | null;
  postMessage: (message: unknown) => void;
};

workerScope.onmessage = async (event) => {
  const { requestId, file } = event.data;

  try {
    const source = await file.text();
    const parsed = parseFm24Export(source);
    const validation = validateFm24Import(parsed);

    workerScope.postMessage({
      type: "complete",
      requestId,
      fileName: file.name,
      fileSize: file.size,
      parsed,
      validation,
    });
  } catch (error) {
    workerScope.postMessage({
      type: "error",
      requestId,
      message: error instanceof Error ? error.message : "The file could not be read.",
    });
  }
};
