import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
    // You can pass configuration options here if needed.
    // By default it uses the current window origin.
});
