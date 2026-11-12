import { parseFm24Export, validateFm24Import } from "./fm24-pipe-parser";

interface ImportRequest {
  requestId: number;
  file: File;
}

const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<ImportRequest>) => void) | null;
  postMessage: (message: unknown) => void;
};

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

workerScope.onmessage = async (event) => {
  const { requestId, file } = event.data;

  try {
    const bytes = await file.arrayBuffer();
    const source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const [parsed, digest] = await Promise.all([
      Promise.resolve(parseFm24Export(source)),
      crypto.subtle.digest("SHA-256", bytes),
    ]);
    const validation = validateFm24Import(parsed);

    workerScope.postMessage({
      type: "complete",
      requestId,
      fileName: file.name,
      fileSize: file.size,
      fingerprint: toHex(digest),
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
