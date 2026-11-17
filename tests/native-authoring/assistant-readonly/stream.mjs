// Runs in the page: observe a clone without reissuing or changing the app response.
export function observeAssistantStreams({ base, workspaceId }) {
    const original = globalThis.fetch;
    globalThis.fetch = async function (input, init) {
        const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.href);
        let body;
        try {
            if (typeof init?.body === 'string')
                body = JSON.parse(init.body);
        }
        catch { }
        const observe = url.origin === base && url.pathname === '/__zudo-assistant' && !url.search && !url.hash && init?.method === 'POST' && body?.operation === 'events' && body.workspaceId === workspaceId;
        const response = await original.apply(this, arguments);
        if (observe) {
            const clone = response.clone();
            void clone.text().then(text => globalThis.__recordAssistantStream({ workspaceId, runId: body.input.runId, status: response.status, contentType: response.headers.get('content-type'), text }), error => globalThis.__recordAssistantStream({ workspaceId, runId: body.input.runId, error: String(error) }));
        }
        return response;
    };
}
