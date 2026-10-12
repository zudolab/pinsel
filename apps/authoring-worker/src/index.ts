export default {
  async fetch(): Promise<Response> {
    return new Response("Pinsel authoring worker: not implemented yet.", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  },
} satisfies ExportedHandler<Env>;
