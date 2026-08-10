type DebugPayload = {
  location: string;
  message: string;
  data?: Record<string, unknown>;
  hypothesisId?: string;
  runId?: string;
};

/** Envia logs do celular para o servidor de dev (via /api/debug-log) e console. */
export function debugLog(payload: DebugPayload) {
  const entry = {
    sessionId: 'f10735',
    timestamp: Date.now(),
    runId: payload.runId ?? 'pre-fix',
    ...payload,
  };

  console.log('[DEBUG-f10735]', JSON.stringify(entry));

  fetch('/api/debug-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  }).catch(() => {});

  fetch('http://127.0.0.1:7503/ingest/b97dc050-ba2c-4f6c-bf4e-2e213b61163f', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': 'f10735',
    },
    body: JSON.stringify(entry),
  }).catch(() => {});
}
