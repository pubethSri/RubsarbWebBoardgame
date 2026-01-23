import * as jose from 'jose';

export class AuthentikService {
    private clientId: string;
    private clientSecret: string;
    private issuer: string;
    private redirectUri: string;
    private jwks: ReturnType<typeof jose.createRemoteJWKSet>;

    constructor() {
        this.clientId = process.env.OIDC_CLIENT_ID || "";
        this.clientSecret = process.env.OIDC_CLIENT_SECRET || "";
        this.issuer = process.env.AUTHENTIK_ISSUER || "";
        // Auto-detect environment for redirect URI
        const baseUrl = process.env.NODE_ENV === 'production'
            ? 'https://ito.it.kmitl.ac.th'
            : `http://localhost:${process.env.PORT || 3000}`;

        this.redirectUri = `${baseUrl}/api/auth/callback/authentik`;

        if (!this.clientId || !this.clientSecret || !this.issuer) {
            console.error("❌ Authentik credentials missing in .env");
            console.error(`Client ID: ${!!this.clientId}, Secret: ${!!this.clientSecret}, Issuer: ${!!this.issuer}`);
            throw new Error("Missing Authentik Environment Variables (OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, AUTHENTIK_ISSUER)");
        }

        // Initialize JWKS for signature verification
        const origin = new URL(this.issuer).origin;
        this.jwks = jose.createRemoteJWKSet(new URL(`${origin}/application/o/ito-app/jwks/`));
        // Note: Generic JWKS URL usually implies looking up via .well-known/openid-configuration, 
        // but for now we assume standard Authentik path or use issuer base. 
        // User screenshot showed /application/o/ito-app/, so JWKS is likely at /application/o/ito-app/jwks/
    }

    getAuthorizationUrl(): string {
        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            response_type: "code",
            scope: "openid profile email groups",
            prompt: "select_user",
        });

        const origin = new URL(this.issuer).origin;
        return `${origin}/application/o/authorize/?${params.toString()}`;
    }

    getLogoutUrl(idToken: string): string {
        const params = new URLSearchParams({
            id_token_hint: idToken,
            // After logout, Authentik should redirect back to home
            post_logout_redirect_uri: process.env.NODE_ENV === 'production'
                ? 'https://ito.it.kmitl.ac.th/'
                : `http://localhost:${process.env.PORT || 3000}/`
        });

        const origin = new URL(this.issuer).origin;
        return `${origin}/application/o/ito-app/end-session/?${params.toString()}`;
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
