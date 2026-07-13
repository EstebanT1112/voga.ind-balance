import type { Session } from "@supabase/supabase-js";
import { env } from "../config/env";

type ApiRequestOptions = Omit<RequestInit, "body" | "headers"> & {
  body?: unknown;
  session: Session;
};

const NETWORK_ERROR_MESSAGE = "No pudimos conectarnos. Revisá tu conexión.";

export function getFriendlyErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) {
    return fallback;
  }

  if (/network request failed|failed to fetch|load failed/i.test(error.message)) {
    return NETWORK_ERROR_MESSAGE;
  }

  return error.message || fallback;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${env.apiUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${options.session.access_token}`,
        "Content-Type": "application/json",
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch (error) {
    throw new Error(getFriendlyErrorMessage(error, NETWORK_ERROR_MESSAGE));
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(payload?.error?.message ?? "API request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
