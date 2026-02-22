import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

function getLogPath(fileName: string) {
  return join(process.cwd(), "logs", fileName);
}

export async function appendOracleJsonLine(fileName: string, payload: unknown) {
  const logPath = getLogPath(fileName);
  const logDir = join(process.cwd(), "logs");
  await mkdir(logDir, { recursive: true });
  await appendFile(logPath, `${JSON.stringify(payload)}\n`, "utf8");
}
