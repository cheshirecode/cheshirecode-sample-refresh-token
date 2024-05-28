// @vitest-environment node
import { describe, expect, test } from "vitest";

import PKCEWrapper from ".";

const config = {
  client_id: "test_client_id",
  redirect_uri: "http://localhost/",
  authz_uri: "https://test-auth.com/auth",
  token_uri: "https://test-auth.com/token",
  requested_scopes: "*",
};

const key = "_test_test";

describe("Verify storage", () => {
  test("defaults to localStorage, sessionStorage empty", async () => {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);

    const authInstance = new PKCEWrapper({ ...config });
    const cleanup = authInstance.testStore(key);

    expect(sessionStorage.getItem(key)).toEqual(null);
    expect(localStorage.getItem(key)).not.toEqual(null);

    cleanup();

    expect(localStorage.getItem(key)).toEqual(null);
  });

  test("set to sessionStorage, localStorage empty", async () => {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);

    const authInstance = new PKCEWrapper({
      ...config,
      storage: sessionStorage,
    });
    const cleanup = authInstance.testStore(key);

    expect(sessionStorage.getItem(key)).not.toEqual(null);
    expect(localStorage.getItem(key)).toEqual(null);
    cleanup();

    expect(sessionStorage.getItem(key)).toEqual(null);
  });
});
