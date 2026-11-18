type SseMessage = { event: string; data: string };

const opened = new Set<{ close: () => Promise<void> }>();

export const closeAllEventStreams = async () => {
   await Promise.all([...opened].map((stream) => stream.close()));
   opened.clear();
};

export const openEventStream = async (url: string, token?: string) => {
   const controller = new AbortController();
   const response = await fetch(url, {
      headers: { Accept: 'text/event-stream', ...(token && { Authorization: `Bearer ${token}` }) },
      signal: controller.signal,
   });
   const messages: SseMessage[] = [];
   let ended = false;

   const reading = (async () => {
      if (!response.body) return;
      const decoder = new TextDecoder();
      let buffer = '';
      try {
         for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
            buffer += decoder.decode(chunk, { stream: true });
            let end = buffer.indexOf('\n\n');
            while (end !== -1) {
               const block = buffer.slice(0, end);
               buffer = buffer.slice(end + 2);
               const lines = block.split('\n');
               const event = lines.find((line) => line.startsWith('event: '))?.slice(7);
               const data = lines
                  .filter((line) => line.startsWith('data: '))
                  .map((line) => line.slice(6))
                  .join('\n');
               if (event) messages.push({ event, data });
               end = buffer.indexOf('\n\n');
            }
         }
      } catch {
         // Aborted by `close`.
      } finally {
         ended = true;
      }
   })();

   const waitFor = async <T>(read: () => T | undefined, what: string, timeoutMs = 5_000) => {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
         const found = read();
         if (found !== undefined) return found;
         await new Promise((resolve) => setTimeout(resolve, 20));
      }
      throw new Error(`Timed out waiting for ${what}; got ${JSON.stringify(messages)}`);
   };

   const stream = {
      status: response.status,
      headers: response.headers,
      messages,
      changes: () =>
         messages
            .filter(({ event }) => event === 'change')
            .map(({ data }) => JSON.parse(data) as Record<string, unknown>),
      nextChange: async (after: number) =>
         waitFor(
            () => {
               const changes = messages
                  .filter(({ event }) => event === 'change')
                  .map(({ data }) => JSON.parse(data) as Record<string, unknown>);
               return changes[after];
            },
            `change #${after + 1}`,
         ),
      waitUntilEnded: () => waitFor(() => (ended ? true : undefined), 'the stream to end'),
      close: async () => {
         controller.abort();
         await reading;
      },
   };
   opened.add(stream);
   return stream;
};
