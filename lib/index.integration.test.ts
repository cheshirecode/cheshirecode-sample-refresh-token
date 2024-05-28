// @vitest-environment node
import { describe, expect, test } from "vitest";

import PKCEWrapper from ".";

const config = {
  redirect_uri: "http://localhost/",
  authz_uri: "https://interview-api.vercel.app/api/authorize",
  token_uri: "https://interview-api.vercel.app/api/oauth/token",
  requested_scopes: "*",
};

describe("Verify PKCE integration authz", () => {
  test("build an authorization url", () => {
    const authInstance = new PKCEWrapper(config);
    const url = authInstance.getAuthorizeUrl();

    expect(url).toContain(config.authz_uri);
    expect(url).toContain("?response_type=code");
    expect(url).toContain("&client_id=" + config.client_id);
    expect(url).toContain("&state=");
    expect(url).toContain("&scope=*");
    expect(url).toContain(
      "&redirect_uri=" + encodeURIComponent(config.redirect_uri),
    );
    expect(url).toContain("&code_challenge=");
    expect(url).not.toContain("%3D");
  });

  test("include additional parameters", () => {
    const authInstance = new PKCEWrapper(config);
    const url = authInstance.getAuthorizeUrl({ test_param: "test" });

    expect(url).toContain(config.authz_uri);
    expect(url).toContain("?response_type=code");
    expect(url).toContain("&test_param=test");
  });
});
