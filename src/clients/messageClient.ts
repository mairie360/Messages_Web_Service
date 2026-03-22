// src/clients/messageClient.ts
import createClient from "openapi-fetch";
import type { paths } from "@mairie360/bff-message-openapi"; 

const messageClient = createClient<paths>({ 
    baseUrl: process.env.MESSAGE_API_URL 
});

export default messageClient;