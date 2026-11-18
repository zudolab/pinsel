export const OWNER_PROTOCOL: string;
export function installNativeOwnerIpc(options: {
  server: { close(): Promise<void> }; nonce: string; port: number; hostRoot: string;
}): { close(): Promise<void>; ready(): Promise<void> };
