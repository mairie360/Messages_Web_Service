// src/clients/messageClient.ts
import createClient from "openapi-fetch";
import type { paths } from "@mairie360/bff-message-openapi";

import { getStoredAuthorizationHeader } from "@/lib/auth-token";

const messageClient = createClient<paths>({
  baseUrl: "/api/bff",
});

messageClient.use({
  onRequest({ request }) {
    if (request.headers.has("Authorization")) return request;

    const authorizationHeader = getStoredAuthorizationHeader();
    if (!authorizationHeader) return request;

    request.headers.set("Authorization", authorizationHeader);

    return request;
  },
});

export default messageClient;
