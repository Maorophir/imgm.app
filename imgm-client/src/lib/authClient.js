import { createAuthClient } from "better-auth/react";
import { API_BASE } from "./api";

export const authClient = createAuthClient({
    // The auth server lives wherever the API does (same origin in production)
    baseURL: API_BASE || window.location.origin
});

export const { signIn, signUp, signOut, useSession } = authClient;
