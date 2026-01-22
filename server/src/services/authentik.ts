
export class AuthentikService {
    private clientId: string;
    private clientSecret: string;
    private issuer: string;
    private redirectUri: string;

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
        }
    }

    getAuthorizationUrl(): string {
        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            response_type: "code",
            scope: "openid profile email groups",
        });

        // Based on user screenshot: use the origin + /application/o/authorize/
        const origin = new URL(this.issuer).origin;
        return `${origin}/application/o/authorize/?${params.toString()}`;
    }

    async getToken(code: string): Promise<string | null> {
        const params = new URLSearchParams({
            grant_type: "authorization_code",
            client_id: this.clientId,
            client_secret: this.clientSecret,
            code: code,
            redirect_uri: this.redirectUri,
        });

        try {
            // Based on user screenshot: use the origin + /application/o/token/
            const origin = new URL(this.issuer).origin;
            const tokenUrl = `${origin}/application/o/token/`;

            console.log("POSTing to Token URL:", tokenUrl);

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

            const data = await res.json() as { access_token: string };
            return data.access_token;
        } catch (e) {
            console.error("Network error during token exchange:", e);
            return null;
        }
    }

    async getUserInfo(accessToken: string): Promise<{ sub: string, preferred_username: string, groups: string[] } | null> {
        // Based on user screenshot: use the origin + /application/o/userinfo/
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
        // Check for specific group names
        if (groups.includes("ito-admin")) return "ADMIN";
        if (groups.includes("ito-creator")) return "CREATOR";
        return "USER";
    }
}
