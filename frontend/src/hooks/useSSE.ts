/**
 * SSE (Server-Sent Events) hook for streaming API responses.
 *
 * Uses fetch + ReadableStream instead of EventSource to support POST requests.
 * Parses SSE event: and data: lines and dispatches to callbacks per event type.
 */

import { useCallback, useRef, useState } from "react";

interface SSEOptions {
  onEvent: (eventType: string, data: unknown) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

interface SSEHook {
  isStreaming: boolean;
  startStream: (url: string, options?: RequestInit) => Promise<void>;
  abort: () => void;
}

export function useSSE({ onEvent, onError, onComplete }: SSEOptions): SSEHook {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const startStream = useCallback(
    async (url: string, fetchOptions?: RequestInit) => {
      abort(); // cancel any existing stream

      const controller = new AbortController();
      abortRef.current = controller;
      setIsStreaming(true);

      try {
        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
          headers: {
            Accept: "text/event-stream",
            "Content-Type": "application/json",
            ...fetchOptions?.headers,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No readable stream");

        const decoder = new TextDecoder();
        let buffer = "";
        let currentEvent = "message";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE lines
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith("event:")) {
              currentEvent = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              const dataStr = line.slice(5).trim();
              try {
                const data = JSON.parse(dataStr);
                onEvent(currentEvent, data);
              } catch {
                // If not JSON, pass as string
                onEvent(currentEvent, dataStr);
              }
              currentEvent = "message"; // reset after dispatching
            }
            // Empty line = end of event (already handled by processing data: line)
          }
        }

        onComplete?.();
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // User aborted — not an error
          return;
        }
        onError?.(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [abort, onEvent, onError, onComplete]
  );

  return { isStreaming, startStream, abort };
}
