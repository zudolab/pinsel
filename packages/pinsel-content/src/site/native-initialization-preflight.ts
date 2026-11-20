import { lstat } from "node:fs/promises";

export async function withAbsentNativeDestinations<T>(destinations: readonly string[], initialize: () => Promise<T>): Promise<T> {
  for (const destination of destinations) {
    try {
      await lstat(destination);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw error;
    }
    throw new Error(`Native initialization destination already exists. Preserve it and review recovery; never reinitialize saved work: ${destination}`);
  }
  return initialize();
}
