import { createServer } from 'node:http';

export function createApiServer(handler, env, origins) {
  return createServer(async (incoming, outgoing) => {
    try {
      const origin = incoming.headers.origin;
      if (origin && !origins.has(origin)) {
        outgoing.writeHead(403, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        outgoing.end(JSON.stringify({ error: 'Origin not allowed' }));
        return;
      }
      const chunks = [];
      let size = 0;
      for await (const chunk of incoming) {
        size += chunk.length;
        if (size > 65536) {
          outgoing.writeHead(413); outgoing.end(); return;
        }
        chunks.push(chunk);
      }
      const headers = new Headers();
      for (const [name, value] of Object.entries(incoming.headers)) {
        if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(', ') : value);
      }
      const method = incoming.method || 'GET';
      // Use a fixed origin: Host and forwarded headers must not control routing.
      const request = new Request(`http://localhost${incoming.url}`, {
        method, headers,
        ...(!['GET', 'HEAD'].includes(method) ? { body: Buffer.concat(chunks) } : {}),
      });
      const response = await handler.fetch(request, env);
      const responseHeaders = new Headers(response.headers);
      responseHeaders.delete('Access-Control-Allow-Origin');
      if (origin) responseHeaders.set('Access-Control-Allow-Origin', origin);
      responseHeaders.set('Vary', 'Origin');
      outgoing.writeHead(response.status, Object.fromEntries(responseHeaders));
      outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch {
      // Never log request headers, URLs, bodies or exception text containing secrets.
      console.error('api_request_failed');
      if (!outgoing.headersSent) outgoing.writeHead(500, { 'Content-Type': 'application/json' });
      outgoing.end(JSON.stringify({ error: 'Internal server error' }));
    }
  });
}
