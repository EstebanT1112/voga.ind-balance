import type { Session } from "@supabase/supabase-js";
import { env } from "../config/env";

type ApiRequestOptions = Omit<RequestInit, "body" | "headers"> & {
  body?: unknown;
  session: Session;
};

export async function apiRequest<T>(path: string, options: ApiRequestOptions): Promise<T> {
  const response = await fetch(`${env.apiUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${options.session.access_token}`,
      "Content-Type": "application/json",
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(payload?.error?.message ?? "API request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
