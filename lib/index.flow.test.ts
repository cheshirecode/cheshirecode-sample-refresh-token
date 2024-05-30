import { beforeEach, describe, expect, test, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";

import { commonHeaders } from "./utils";

import PKCEWrapper from ".";

const fetchMocker = createFetchMock(vi);
fetchMocker.enableMocks();

const config = {
  redirect_uri: "http://localhost/",
  authz_uri: "https://test-auth.com/auth",
  token_uri: "https://test-auth.com/token",
  requested_scopes: "*",
};

describe("PKCE code_verifier is persisted", () => {
  test("same code_verifier", () => {
    const authInstance = new PKCEWrapper(config);
    expect(authInstance.getCodeVerifier()).toEqual(
      authInstance.getCodeVerifier(),
    );
  });
  test("delete code_verifier, then generate again", () => {
    const authInstance = new PKCEWrapper(config);
    authInstance.removeCodeVerifier();
    expect(authInstance.getCodeVerifier(false)).toEqual(null);
    expect(authInstance.getCodeVerifier()).not.toEqual(null);
  });
});

describe("PKCE authz url", () => {
  test("build an authz url", () => {
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

  test("include additional parameters", () => {
    const authInstance = new PKCEWrapper(config);
    const url = authInstance.getAuthorizeUrl({ test_param: "test" });

    expect(url).toContain(config.authz_uri);
    expect(url).toContain("?response_type=code");
    expect(url).toContain("&test_param=test");
  });

  test("update state from additional params", async () => {
    const authInstance = new PKCEWrapper(config);
    const url = authInstance.getAuthorizeUrl({ state: "Anewteststate" });

    expect(url).toContain("&state=Anewteststate");
    expect(localStorage.getItem("pkce_state")).toEqual("Anewteststate");
  });
});

describe("PKCE exchange code for token", () => {
  let authInstance: PKCEWrapper;
  beforeEach(() => {
    authInstance = new PKCEWrapper(config);
  });
  test("throw an error when error is present", async () => {
    expect.assertions(1);
    const url = "https://test-auth.com?error=Test+Failure";
    // const authInstance = new PKCEWrapper(config);

    try {
      await authInstance.exchangeForAccessToken(url);
    } catch (e) {
      expect(e).toEqual({
        error: "Test Failure",
      });
    }
  });

  test("throw an error when state mismatch", async () => {
    expect.assertions(1);
    const url = "https://test-auth.com?state=invalid";
    // const authInstance = new PKCEWrapper(config);

    try {
      await authInstance.exchangeForAccessToken(url);
    } catch (e) {
      expect(e).toEqual({
        error: "Invalid State",
      });
    }
  });

  test("make a request to token endpoint", async () => {
    await mockRequest();

    expect(fetchMocker.mock.calls.length).toEqual(1);
    expect(fetchMocker.mock.calls[0][0]).toEqual(config.token_uri);
  });

  test("request with headers", async () => {
    await mockRequest();
    const headers = fetchMocker.mock?.calls[0][1].headers ?? {};

    expect(headers["Accept"]).toEqual(commonHeaders.Accept);
    expect(headers["Content-Type"]).toEqual(commonHeaders["Content-Type"]);
  });

  test("request for exchange with body", async () => {
    await mockRequest();
    const body = new URLSearchParams(
      fetchMocker.mock.calls[0][1].body.toString(),
    );

    expect(body.get("grant_type")).toEqual("authorization_code");
    expect(body.get("code")).toEqual("123");
    expect(body.get("redirect_uri")).toEqual(config.redirect_uri);
    expect(body.get("code_verifier")).not.toEqual(null);
  });

  test("request with additional parameters", async () => {
    await mockRequest({ test_param: "testing" });
    const body = new URLSearchParams(
      fetchMocker.mock.calls[0][1].body.toString(),
    );

    expect(body.get("grant_type")).toEqual("authorization_code");
    expect(body.get("test_param")).toEqual("testing");
  });

  test("CORS is enabled", async () => {
    // enable cors credentials
    await mockRequest({}, true);
    expect(fetchMocker.mock.calls[0][1]?.mode).toEqual("cors");
    expect(fetchMocker.mock.calls[0][1]?.credentials).toEqual("include");
  });

  const mockRequest = async function (
    additionalParams: object = {},
    cors = false,
  ) {
    localStorage.setItem("pkce_state", "teststate");
    const url = "https://test-auth.com?state=teststate&code=123";
    // const authInstance = new PKCEWrapper(config);

    const mockSuccessResponse = {
      access_token: "token",
      expires_at: 123,
      refresh_token: "refresh",
      scope: "*",
      token_type: "type",
    };

    fetchMocker.resetMocks();
    fetchMocker.mockResponseOnce(JSON.stringify(mockSuccessResponse));

    await authInstance.exchangeForAccessToken(url, additionalParams, cors);
  };
});

describe("PKCE refresh token", () => {
  const refreshToken = "REFRESH_TOKEN";

  test("make a request to token endpoint", async () => {
    await mockRequest();

    expect(fetchMocker.mock.calls.length).toEqual(1);
    expect(fetchMocker.mock.calls[0][0]).toEqual(config.token_uri);
  });

  test("request with headers", async () => {
    await mockRequest();
    const headers = fetchMocker.mock.calls[0][1].headers ?? {};

    expect(headers["Accept"]).toEqual(commonHeaders.Accept);
    expect(headers["Content-Type"]).toEqual(commonHeaders["Content-Type"]);
  });

  test("request for refresh with body", async () => {
    await mockRequest();
    const body = new URLSearchParams(
      fetchMocker.mock.calls[0][1].body.toString(),
    );

    expect(body.get("grant_type")).toEqual("refresh_token");
    expect(body.get("refresh_token")).toEqual(refreshToken);
  });

  const mockRequest = async function () {
    const authInstance = new PKCEWrapper(config);
    authInstance.setRefreshToken("old");
    const mockSuccessResponse = {
      access_token: "token",
      expires_at: 123,
      refresh_token: "refresh",
      scope: "*",
      token_type: "type",
    };

    fetchMocker.resetMocks();
    fetchMocker.mockResponseOnce(JSON.stringify(mockSuccessResponse));

    await authInstance.refreshAccessToken(refreshToken);
  };
});
