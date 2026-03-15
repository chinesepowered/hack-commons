import { config } from "../config";

export async function unbrowseResolve(
  intent: string,
  url?: string
): Promise<Record<string, unknown>> {
  const payload: Record<string, unknown> = {
    intent,
    params: {},
  };
  if (url) {
    (payload.params as Record<string, unknown>).url = url;
    payload.context = { url };
  }

  const response = await fetch(`${config.unbrowseUrl}/v1/intent/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Unbrowse error: ${response.status}`);
  return response.json();
}
