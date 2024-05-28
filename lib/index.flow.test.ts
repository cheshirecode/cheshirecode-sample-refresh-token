import { beforeEach, describe, expect, test, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
const fetchMocker = createFetchMock(vi);
fetchMocker.enableMocks();

import PKCEWrapper from ".";

const config = {
  client_id: "test_client_id",
  redirect_uri: "http://localhost/",
  authz_uri: "https://test-auth.com/auth",
  token_uri: "https://test-auth.com/token",
  requested_scopes: "*",
};

describe("Verify PKCE persisted code_verifier", () => {
  test("same code_verifier", () => {
    const authInstance = new PKCEWrapper(config);
    expect(authInstance.generateCodeVerifier()).toEqual(
      authInstance.generateCodeVerifier(),
    );
  });
});

describe("Verify PKCE authorization url", () => {
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
    expect(url).toContain("&client_id=" + config.client_id);
    expect(url).toContain("&test_param=test");
  });

  test("update state from additional params", async () => {
    const authInstance = new PKCEWrapper(config);
    const url = authInstance.getAuthorizeUrl({ state: "Anewteststate" });

    expect(url).toContain("&state=Anewteststate");
    expect(localStorage.getItem("pkce_state")).toEqual("Anewteststate");
  });
});

describe("Verify PKCE exchange code for token", () => {
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

    expect(headers["Accept"]).toEqual("application/json");
    expect(headers["Content-Type"]).toEqual(
      "application/x-www-form-urlencoded;charset=UTF-8",
    );
  });

  test("request for exchange with body", async () => {
    await mockRequest();
    const body = new URLSearchParams(
      fetchMocker.mock.calls[0][1].body.toString(),
    );

    expect(body.get("grant_type")).toEqual("authorization_code");
    expect(body.get("code")).toEqual("123");
    expect(body.get("client_id")).toEqual(config.client_id);
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
    await mockRequest({});
    expect(fetchMocker.mock.calls[0][1]?.mode).toEqual("cors");
    expect(fetchMocker.mock.calls[0][1]?.credentials).toEqual("include");
  });

  const mockRequest = async function (additionalParams: object = {}) {
    localStorage.setItem("pkce_state", "teststate");
    const url = "https://test-auth.com?state=teststate&code=123";
    // const authInstance = new PKCEWrapper(config);

    const mockSuccessResponse = {
      access_token: "token",
      expires_in: 123,
      refresh_expires_in: 234,
      refresh_token: "refresh",
      scope: "*",
      token_type: "type",
    };

    fetchMocker.resetMocks();
    fetchMocker.mockResponseOnce(JSON.stringify(mockSuccessResponse));

    await authInstance.exchangeForAccessToken(url, additionalParams);
  };
});

describe("Verify PKCE refresh token", () => {
  const refreshToken = "REFRESH_TOKEN";

  test("make a request to token endpoint", async () => {
    await mockRequest();

    expect(fetchMocker.mock.calls.length).toEqual(1);
    expect(fetchMocker.mock.calls[0][0]).toEqual(config.token_uri);
  });

  test("request with headers", async () => {
    await mockRequest();
    const headers = fetchMocker.mock.calls[0][1].headers ?? {};

    expect(headers["Accept"]).toEqual("application/json");
    expect(headers["Content-Type"]).toEqual(
      "application/x-www-form-urlencoded;charset=UTF-8",
    );
  });

  test("request for refresh with body", async () => {
    await mockRequest();
    const body = new URLSearchParams(
      fetchMocker.mock.calls[0][1].body.toString(),
    );

    expect(body.get("grant_type")).toEqual("refresh_token");
    expect(body.get("client_id")).toEqual(config.client_id);
    expect(body.get("refresh_token")).toEqual(refreshToken);
  });

  const mockRequest = async function () {
    const authInstance = new PKCEWrapper(config);

    const mockSuccessResponse = {
      access_token: "token",
      expires_in: 123,
      refresh_expires_in: 234,
      refresh_token: "refresh",
      scope: "*",
      token_type: "type",
    };

    fetchMocker.resetMocks();
    fetchMocker.mockResponseOnce(JSON.stringify(mockSuccessResponse));

    await authInstance.refreshAccessToken(refreshToken);
  };
});
