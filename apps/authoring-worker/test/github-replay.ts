// Replays recorded GitHub REST responses (test/fixtures/github/*.json) for the
// GitHub publication provider. Every request must match a route; anything else
// throws, so a test can never reach the network.

const RAW = import.meta.glob("./fixtures/github/*.json", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

function base64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  // GitHub wraps the contents API base64 at 60 columns.
  return (btoa(binary).match(/.{1,60}/g) ?? []).join("\\n");
}

/** A fixture with `{{NAME}}` / `{{BASE64:NAME}}` filled in, parsed. */
export function fixture(name: string, vars: Record<string, string | number> = {}): any {
  const raw = RAW[`./fixtures/github/${name}.json`];
  if (raw === undefined) throw new Error(`No GitHub fixture "${name}".`);
  const filled = raw.replace(/\{\{(BASE64:)?([A-Z_]+)\}\}/g, (_match, encode: string | undefined, key: string) => {
    if (!(key in vars)) throw new Error(`Fixture "${name}" needs {{${key}}}.`);
    return encode ? base64Utf8(String(vars[key])) : String(vars[key]);
  });
  return JSON.parse(filled);
}

export function checkRun(input: { id: number; name: string; headSha: string; status?: "queued" | "in_progress" | "completed"; conclusion?: string | null; summary?: string | null; app?: string }): unknown {
  const status = input.status ?? "completed";
  const conclusion = status === "completed" ? (input.conclusion === undefined ? "success" : input.conclusion) : null;
  return fixture("check-run", {
    RUN_ID: input.id,
    RUN_NAME: input.name,
    RUN_HEAD_SHA: input.headSha,
    RUN_STATUS: status,
    RUN_CONCLUSION: JSON.stringify(conclusion),
    RUN_COMPLETED_AT: JSON.stringify(status === "completed" ? "2026-10-13T00:05:00Z" : null),
    RUN_SUMMARY: JSON.stringify(input.summary ?? null),
    RUN_APP: input.app ?? "github-actions",
  });
}

export function checkRuns(runs: unknown[]): unknown {
  return fixture("check-runs", { TOTAL: runs.length, RUNS: JSON.stringify(runs) });
}

export interface RecordedRequest {
  method: string;
  /** Path below `/repos/<owner>/<repo>`, query included. */
  path: string;
  body: any;
  headers: Headers;
}

export type Reply = { status: number; body?: unknown } | { throws: "timeout" | "network" };

export interface Replay {
  fetch: typeof fetch;
  requests: RecordedRequest[];
  /** Route `METHOD path` (exact, query included) to replies; the last reply repeats. */
  on(method: string, path: string, ...replies: Reply[]): Replay;
  /** Requests other than GET. */
  writes(): RecordedRequest[];
}

export function createReplay(repo = "zudolab/pinsel"): Replay {
  const routes = new Map<string, Reply[]>();
  const requests: RecordedRequest[] = [];
  const prefix = `https://api.github.com/repos/${repo}`;
  const replay: Replay = {
    requests,
    on(method, path, ...replies) {
      routes.set(`${method} ${path}`, replies);
      return replay;
    },
    writes: () => requests.filter((request) => request.method !== "GET"),
    fetch: (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input instanceof Request ? input.url : input);
      if (!url.startsWith(prefix)) throw new Error(`Unexpected request outside ${prefix}: ${url}`);
      const method = init?.method ?? "GET";
      const path = url.slice(prefix.length);
      const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
      requests.push({ method, path, body, headers: new Headers(init?.headers) });
      const replies = routes.get(`${method} ${path}`);
      if (!replies || replies.length === 0) throw new Error(`No recorded response for ${method} ${path}`);
      const reply = replies.length > 1 ? replies.shift()! : replies[0]!;
      if ("throws" in reply) {
        if (reply.throws === "timeout") throw new DOMException("The operation timed out.", "TimeoutError");
        throw new TypeError("Network connection lost.");
      }
      return new Response(reply.body === undefined ? null : JSON.stringify(reply.body), { status: reply.status, headers: { "content-type": "application/json; charset=utf-8" } });
    }) as typeof fetch,
  };
  return replay;
}
