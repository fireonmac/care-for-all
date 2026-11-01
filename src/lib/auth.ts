import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "@/db";
import { getAuthEnv } from "@/env";

const env = getAuthEnv();

export const auth = betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
        provider: "sqlite",
    }),
    socialProviders: {
        google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
        },
    },
});

import { headers } from "next/headers";

export async function getSession() {
    return auth.api.getSession({ headers: await headers() });
}
