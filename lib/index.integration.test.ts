// @vitest-environment node
import { describe, expect, test } from "vitest";

import PKCEWrapper from ".";

const config = {
  redirect_uri: "http://localhost/",
  authz_uri: "https://interview-api.vercel.app/api/authorize",
  token_uri: "https://interview-api.vercel.app/api/oauth/token",
  requested_scopes: "*",
};

describe("Verify PKCE live authz", () => {
  test("build an authorization url", () => {
    const authInstance = new PKCEWrapper(config);
    const url = authInstance.getAuthorizeUrl();

    expect(url).toContain(config.authz_uri);
    expect(url).toContain("?response_type=code");
    expect(url).toContain("&state=");
    expect(url).toContain("&scope=*");
    expect(url).toContain(
      "&redirect_uri=" + encodeURIComponent(config.redirect_uri),
    );
    expect(url).toContain("&code_challenge=");
    expect(url).not.toContain("%3D");
  });

  test("make authz request", async () => {
    const authInstance = new PKCEWrapper(config);
    const res = await authInstance.exchangeForAccessToken(
      authInstance.getAuthorizeUrl(),
    );
    expect(res).toHaveProperty("access_token");
    expect(res).toHaveProperty("refresh_token");
    expect(res).toHaveProperty("expires_at");
  });
});

describe("Verify PKCE live token refresh", () => {
  test("make refresh request", async () => {
    const authInstance = new PKCEWrapper(config);
    const res = await authInstance.refreshAccessToken();
    expect(res).toHaveProperty("access_token");
    expect(res).toHaveProperty("refresh_token");
    expect(res).toHaveProperty("expires_at");
  });
});
