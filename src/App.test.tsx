/* eslint-disable import/no-named-as-default */
/**
 * @vitest-environment jsdom
 */
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";

import App from "./App";
import { getConfig as getAuthzConfig } from "./services/authz";

const fetchMocker = createFetchMock(vi);
fetchMocker.enableMocks();

beforeEach(() => {
  location.href = "https://localhost";
  fetchMocker.resetMocks();
});
describe("main App", () => {
  it("clicking Login navigates to authz URI", async () => {
    const renderedApp = render(<App />);
    const user = userEvent.setup();
    const loginBtn = renderedApp.getByTestId("btn-login");
    expect(loginBtn).toBeTruthy();
    await user.click(loginBtn);
    expect(location.href).toContain(getAuthzConfig().authz_uri);
  });

  it("on redirected URL with state and code", async () => {
    location.href = `https://localhost/?state=${localStorage.getItem("pkce_state")}&code=ygo9jssbmmvgokjwuqx5`;
    const renderedApp = render(<App />);

    const mockSuccessResponse = {
      access_token: "token",
      expires_at: 123,
      refresh_token: "refresh",
      scope: "*",
      token_type: "type",
    };
    fetchMocker.mockResponseOnce(JSON.stringify(mockSuccessResponse));
    const refreshTokenEle =
      await renderedApp.findByTestId("refreshToken-value");
    expect(refreshTokenEle.innerHTML).toEqual(
      mockSuccessResponse.refresh_token,
    );
  });

  it("should refresh token", async () => {
    const renderedApp = render(<App />);
    const mockSuccessResponse = {
      access_token: "token",
      expires_at: 123,
      refresh_token: "refresh",
      scope: "*",
      token_type: "type",
    };
    fetchMocker.mockResponseOnce(JSON.stringify(mockSuccessResponse));
    const logoutBtn = renderedApp.getByTestId("btn-logout");
    expect(logoutBtn).toBeTruthy();
  });
});
