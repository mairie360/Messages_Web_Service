import { sessionFetch } from '@mairie360/front-kit/browser';
import axios, { type AxiosAdapter } from "axios";
import { getBffMessage } from "@mairie360/bff-message-openapi/endpoints/bffMessage";

export type BffErrorDetail = { path?: string; message: string };

/**
 * HTTP refusal of the BFF: `message` is its `error.message` (French fallback otherwise), with the status and the
 * `error.code` / `error.details[]` of the shared ErrorResponse envelope, so a form can explain the refused fields
 * (MAIR-512).
 */
export class BffRequestError extends Error {
  readonly code: string | undefined;
  readonly details: readonly BffErrorDetail[];

  constructor(message: string, readonly status: number, body?: unknown) {
    super(message);
    this.name = "BffRequestError";
    const error = (body as { error?: { code?: unknown; details?: unknown } } | null | undefined)?.error;
    this.code = typeof error?.code === "string" ? error.code : undefined;
    this.details = Array.isArray(error?.details)
      ? error.details.flatMap((detail: unknown) => {
        const item = detail as { path?: unknown; message?: unknown } | null;
        return typeof item?.message === "string"
          ? [{ path: typeof item.path === "string" ? item.path : undefined, message: item.message }]
          : [];
      })
      : [];
  }
}

/** A browser-managed redirect needs a page navigation, not a cross-origin data fetch. */
export class BffNavigationRequiredError extends Error {
  constructor() {
    super("La connexion doit être vérifiée en rouvrant la page.");
    this.name = "BffNavigationRequiredError";
  }
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text) return undefined as T;

  return JSON.parse(text) as T;
}

export async function bffRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);

  headers.set("Accept", "application/json");

  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await sessionFetch(path, {
    ...init,
    headers,
    cache: "no-store",
    redirect: "manual",
  });

  // Manual browser redirects intentionally hide Location/status/body. Never
  // invent a 401, inspect an opaque body or navigate to an unverified target.
  if (response.type === "opaqueredirect") {
    throw new BffNavigationRequiredError();
  }

  if (!response.ok) {
    const errorBody = await readJson<{ message?: string; error?: { message?: string; code?: string; details?: unknown } }>(
      response,
    ).catch(() => null);
    const serviceMessage = [errorBody?.error?.message, errorBody?.message].find(
      (value) => typeof value === "string" && value.trim(),
    );
    const message = serviceMessage ?? (
      response.status >= 500
        ? "Le service de messagerie est temporairement indisponible."
        : "La demande n’a pas pu aboutir."
    );

    throw new BffRequestError(message, response.status, errorBody);
  }

  return readJson<T>(response);
}

// The generated operations of the published BFF Message contract own every path: axios only carries the
// request through bffRequest, which keeps the same-origin cookie, redirect and error handling.
const contractAdapter: AxiosAdapter = async (config) => {
  const headers = config.headers.toJSON() as Record<string, string>;
  const isMultipart = typeof FormData !== "undefined" && config.data instanceof FormData;
  // The browser must set the multipart boundary itself.
  if (isMultipart) delete headers["Content-Type"];
  const data = await bffRequest<unknown>(axios.getUri(config), {
    method: (config.method ?? "get").toUpperCase(),
    headers,
    body: typeof config.data === "string" || isMultipart ? config.data : undefined,
    signal: (config.signal as AbortSignal | undefined) ?? undefined,
  });
  return {
    data,
    status: data === undefined ? 204 : 200,
    statusText: data === undefined ? "No Content" : "OK",
    headers: {},
    config,
  };
};

export const bffMessage = getBffMessage(axios.create({ adapter: contractAdapter, headers: { Accept: "application/json" } }));
