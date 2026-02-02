import * as jose from 'jose';

export class KeycloakService {
    private clientId: string;
    private clientSecret: string;
    private issuer: string;
    private redirectUri: string;
    private jwks: ReturnType<typeof jose.createRemoteJWKSet>;

    constructor() {
        this.clientId = process.env.KEYCLOAK_CLIENT_ID || "";
        this.clientSecret = process.env.KEYCLOAK_CLIENT_SECRET || "";
        this.issuer = process.env.KEYCLOAK_ISSUER || "";

        // Auto-detect environment for redirect URI
        const baseUrl = process.env.NODE_ENV === 'production'
            ? 'https://ito.it.kmitl.ac.th'
            : `http://localhost:${process.env.PORT || 3000}`;

        this.redirectUri = `${baseUrl}/api/auth/callback/keycloak`;

        if (!this.clientId || !this.clientSecret || !this.issuer) {
            console.error("❌ Keycloak credentials missing in .env");
            // Allow app to start even if missing, just log error
        }

        // Initialize JWKS
        // Keycloak JWKS is usually at /protocol/openid-connect/certs
        // The issuer URL usually doesn't end with slash, but we should handle it
        const issuerUrl = this.issuer.endsWith('/') ? this.issuer.slice(0, -1) : this.issuer;
        this.jwks = jose.createRemoteJWKSet(new URL(`${issuerUrl}/protocol/openid-connect/certs`));
    }

    getAuthorizationUrl(): string {
        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            response_type: "code",
            scope: "openid profile email",
            // Keycloak doesn't strictly need prompt=consent but it's good for testing
            // prompt: "consent", 
        });

        const issuerUrl = this.issuer.endsWith('/') ? this.issuer.slice(0, -1) : this.issuer;
        return `${issuerUrl}/protocol/openid-connect/auth?${params.toString()}`;
    }

    getLogoutUrl(idToken: string): string {
        const params = new URLSearchParams({
            id_token_hint: idToken,
            post_logout_redirect_uri: 'https://ito.it.kmitl.ac.th/'
            // Note: Standard OIDC uses post_logout_redirect_uri. 
            // Keycloak supports this.
        });

        const issuerUrl = this.issuer.endsWith('/') ? this.issuer.slice(0, -1) : this.issuer;
        return `${issuerUrl}/protocol/openid-connect/logout?${params.toString()}`;
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
            const issuerUrl = this.issuer.endsWith('/') ? this.issuer.slice(0, -1) : this.issuer;
            const tokenUrl = `${issuerUrl}/protocol/openid-connect/token`;

            const res = await fetch(tokenUrl, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: params,
            });

            if (!res.ok) {
                const text = await res.text();
                console.error("Keycloak Token Exchange Failed:", res.status, text);
                return null;
            }

            const data = await res.json() as { access_token: string, id_token?: string };
            return {
                access_token: data.access_token,
                id_token: data.id_token
            };
        } catch (e) {
            console.error("Network error during Keycloak token exchange:", e);
            return null;
        }
    }

    async getUserInfo(accessToken: string): Promise<{ sub: string, preferred_username: string, groups: string[] } | null> {
        const issuerUrl = this.issuer.endsWith('/') ? this.issuer.slice(0, -1) : this.issuer;
        const infoUrl = `${issuerUrl}/protocol/openid-connect/userinfo`;

        try {
            const res = await fetch(infoUrl, {
                headers: { "Authorization": `Bearer ${accessToken}` }
            });

            if (!res.ok) {
                console.error("Keycloak UserInfo Failed:", res.status);
                return null;
            }

            const data = await res.json() as any;

            // Keycloak group mapping might differ. 
            // Often groups are in strict claim or need mapper. 
            // For now assume standard or no groups.
            // data.groups might not exist by default in Keycloak unless configured.

            return {
                sub: data.sub,
                preferred_username: data.preferred_username || data.email || "Unknown",
                groups: data.groups || []
            };
        } catch (e) {
            console.error("Keycloak UserInfo Network error:", e);
            return null;
        }
    }

    // Reuse same logic for roles or adapt if Keycloak returns different group structure
    mapGroupsToRole(groups: string[]): "ADMIN" | "CREATOR" | "USER" {
        // Keycloak groups often start with /
        if (groups.includes("ito-admin") || groups.includes("/ito-admin")) return "ADMIN";
        if (groups.includes("ito-creator") || groups.includes("/ito-creator")) return "CREATOR";
        return "USER";
    }
}
