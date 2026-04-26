import { join } from "@tauri-apps/api/path";
import { readDir, readFile, writeTextFile } from "@tauri-apps/plugin-fs";

const fatalUtf8Decoder = new TextDecoder("utf-8", { fatal: true });
const lossyUtf8Decoder = new TextDecoder("utf-8");

function isValidUtf8(data: Uint8Array): boolean {
  try {
    fatalUtf8Decoder.decode(data);
    return true;
  } catch {
    return false;
  }
}

export async function findInvalidUtf8Files(dir: string): Promise<string[]> {
  const invalidFiles: string[] = [];

  async function scan(currentPath: string) {
    const entries = await readDir(currentPath);

    for (const entry of entries) {
      const entryPath = await join(currentPath, entry.name);
      if (entry.isDirectory) {
        await scan(entryPath);
      } else if (entry.isFile) {
        const data = await readFile(entryPath);
        if (!isValidUtf8(data)) {
          invalidFiles.push(entryPath);
        }
      }
    }
  }

  await scan(dir);
  return invalidFiles;
}

export async function fixFileEncoding(filePath: string): Promise<boolean> {
  try {
    const data = await readFile(filePath);
    const text = lossyUtf8Decoder.decode(data);
    await writeTextFile(filePath, text);
    return true;
  } catch {
    return false;
  }
}
