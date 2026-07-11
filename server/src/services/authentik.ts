import * as jose from 'jose';

export class AuthentikService {
    private clientId: string;
    private clientSecret: string;
    private issuer: string;
    private baseUrl: string;
    private redirectUri: string;
    private appSlug: string;
    private jwks: ReturnType<typeof jose.createRemoteJWKSet>;

    /**
     * Returns null when OIDC env vars are absent so the game can run
     * fully anonymous (auth is only needed for pack creation / admin).
     */
    static fromEnv(): AuthentikService | null {
        const clientId = process.env.OIDC_CLIENT_ID;
        const clientSecret = process.env.OIDC_CLIENT_SECRET;
        const issuer = process.env.AUTHENTIK_ISSUER;

        if (!clientId || !clientSecret || !issuer) {
            console.log("ℹ️  OIDC disabled (OIDC_CLIENT_ID / OIDC_CLIENT_SECRET / AUTHENTIK_ISSUER not set)");
            return null;
        }
        return new AuthentikService(clientId, clientSecret, issuer);
    }

    private constructor(clientId: string, clientSecret: string, issuer: string) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.issuer = issuer;
        this.baseUrl = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`;
        this.redirectUri = `${this.baseUrl}/api/auth/callback/authentik`;
        this.appSlug = process.env.OIDC_APP_SLUG || "ito-app";

        // Authentik publishes per-application JWKS under /application/o/<slug>/jwks/
        const origin = new URL(this.issuer).origin;
        this.jwks = jose.createRemoteJWKSet(new URL(`${origin}/application/o/${this.appSlug}/jwks/`));

        console.log(`🔐 OIDC enabled (issuer: ${this.issuer}, redirect: ${this.redirectUri})`);
    }

    getAuthorizationUrl(): string {
        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            response_type: "code",
            scope: "openid profile email groups",
            prompt: "consent",
        });

        const origin = new URL(this.issuer).origin;
        return `${origin}/application/o/authorize/?${params.toString()}`;
    }

    getLogoutUrl(idToken: string): string {
        const params = new URLSearchParams({
            id_token_hint: idToken,
            post_logout_redirect_uri: `${this.baseUrl}/`
        });
        const origin = new URL(this.issuer).origin;
        return `${origin}/application/o/${this.appSlug}/end-session/?${params.toString()}`;
    }

    async getToken(code: string): Promise<{ access_token: string, id_token?: string } | null> {
        const params = new URLSearchParams({
            grant_type: "authorization_code",
            client_id: this.clientId,
            client_secret: this.clientSecret,
            code: code,
            redirect_uri: this.redirectUri,
        });

        try {
            const origin = new URL(this.issuer).origin;
            const tokenUrl = `${origin}/application/o/token/`;

            const res = await fetch(tokenUrl, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: params,
            });

            if (!res.ok) {
                const text = await res.text();
                console.error("Token Exchange Failed:", res.status, text);
                return null;
            }

            const data = await res.json() as { access_token: string, id_token?: string };
            return {
                access_token: data.access_token,
                id_token: data.id_token
            };
        } catch (e) {
            console.error("Network error during token exchange:", e);
            return null;
        }
    }

    async getUserInfo(accessToken: string): Promise<{ sub: string, preferred_username: string, groups: string[] } | null> {
        const origin = new URL(this.issuer).origin;
        const infoUrl = `${origin}/application/o/userinfo/`;

        try {
            const res = await fetch(infoUrl, {
                headers: { "Authorization": `Bearer ${accessToken}` }
            });

            if (!res.ok) {
                console.error("UserInfo Failed:", res.status);
                return null;
            }

            const data = await res.json() as any;
            return {
                sub: data.sub,
                preferred_username: data.preferred_username || data.nickname || data.email || "Unknown",
                groups: data.groups || []
            };
        } catch (e) {
            console.error("UserInfo Network error:", e);
            return null;
        }
    }

    mapGroupsToRole(groups: string[]): "ADMIN" | "CREATOR" | "USER" {
        if (groups.includes("ito-admin")) return "ADMIN";
        if (groups.includes("ito-creator")) return "CREATOR";
        return "USER";
    }

    async verifyLogoutToken(token: string): Promise<string | null> {
        try {
            const { payload } = await jose.jwtVerify(token, this.jwks, {
                issuer: this.issuer,
                audience: this.clientId
            });

            // Backchannel Logout Token Validation
            // https://openid.net/specs/openid-connect-backchannel-1_0.html
            if (payload.events && typeof payload.events === 'object' && 'http://schemas.openid.net/event/backchannel-logout' in payload.events) {
                return payload.sub || null;
            }
            return null;
        } catch (e) {
            console.error("Logout Token Verification Failed:", e);
            return null;
        }
    }
}
