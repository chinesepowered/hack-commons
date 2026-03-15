import { config } from "../config";

const UNBROWSE_BASE = () => config.unbrowseUrl || "http://localhost:6969";

/** Search the Unbrowse skill marketplace */
export async function unbrowseSearch(
  intent: string,
  domain?: string
): Promise<Record<string, unknown>> {
  const path = domain ? "/v1/search/domain" : "/v1/search";
  const body: Record<string, unknown> = { intent, k: 5 };
  if (domain) body.domain = domain;

  const response = await fetch(`${UNBROWSE_BASE()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Unbrowse search error: ${response.status}`);
  return response.json();
}

/** Execute a known Unbrowse skill endpoint */
export async function unbrowseExecute(
  skillId: string,
  endpointId: string,
  params?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const body: Record<string, unknown> = { endpoint_id: endpointId };
  if (params) body.params = params;

  const response = await fetch(`${UNBROWSE_BASE()}/v1/skills/${skillId}/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Unbrowse execute error: ${response.status}`);
  return response.json();
}

/** List all locally cached Unbrowse skills */
export async function unbrowseSkills(): Promise<Record<string, unknown>> {
  const response = await fetch(`${UNBROWSE_BASE()}/v1/skills`);
  if (!response.ok) throw new Error(`Unbrowse skills error: ${response.status}`);
  return response.json();
}

/** Try resolve (browser capture) — may fail in WSL/serverless environments */
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

  const response = await fetch(`${UNBROWSE_BASE()}/v1/intent/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Unbrowse error: ${response.status}`);
  return response.json();
}

/** Health check */
export async function unbrowseHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${UNBROWSE_BASE()}/health`);
    const data = await response.json();
    return data.status === "ok";
  } catch {
    return false;
  }
}
