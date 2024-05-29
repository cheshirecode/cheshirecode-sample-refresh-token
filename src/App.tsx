/* eslint-disable import/no-named-as-default-member */
import cx from "classnames";
import dayjs from "dayjs";
import LocalizedFormat from "dayjs/plugin/localizedFormat";
import relativeTime from "dayjs/plugin/relativeTime";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { useCallback, useEffect, useRef, useState } from "react";

import loginImg from "./assets/login.svg"; // https://undraw.co/illustrations
import Details from "./components/Details";
import { getConfig as getAuthzConfig } from "./services/authz";
import useOnLoad, { useAuthParams } from "./services/browser/useOnLoad";
import PKCEWrapper from "../lib";
import { TokenResponse } from "../lib/typings";

dayjs.extend(relativeTime);
dayjs.extend(LocalizedFormat);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault(dayjs.tz.guess());

const App = () => {
  const authInstance = useRef<PKCEWrapper | null>(null);
  const [params, setParams] = useState<{
    codeVerifier: string;
    codeChallenge: string;
    expiresAt?: number;
    refreshToken?: string;
    accessToken?: string;
  }>({ codeVerifier: "", codeChallenge: "" });

  const saveRefreshTokenWithResponse = useCallback(
    (response: TokenResponse | undefined | null) => {
      if (!response) {
        return;
      }
      const refreshToken = String(response?.refresh_token);
      authInstance.current?.setRefreshToken(refreshToken);
      const expiresAt = response?.expires_at;
      setParams((p) => ({
        ...p,
        refreshToken,
        accessToken: response?.access_token,
        ...(response.expires_at
          ? {
              expiresAt,
              displayExpiresAt: dayjs(response.expires_at).format("LLLLZ"),
              displayExpiresIn: dayjs(expiresAt).toNow(),
            }
          : {}),
      }));
    },
    [],
  );

  const logout = useCallback(() => {
    authInstance.current?.setRefreshToken("");
    if (authInstance.current) {
      authInstance.current.expiresAt = 0;
    }
    location.href = "/";
  }, []);

  // (3) Handling successful authorization
  const [state, code] = useAuthParams();
  const isExperimental = useOnLoad(
    (l) => !!new URLSearchParams(l.search).get("isExperimental"),
  );

  useEffect(() => {
    // init 1 instance per component to allow logic extraction to hook or child component eventually
    authInstance.current = new PKCEWrapper(getAuthzConfig());

    const expiresAt = authInstance.current?.expiresAt;
    // (1) Generating code challenge and verifier - NOTE that code challenge is deferred to clicking login as there's no need to persist it unlike code verifier
    setParams((p) => ({
      ...p,
      codeVerifier: authInstance.current?.getCodeVerifier() ?? "",
      codeChallenge: authInstance.current?.generateCodeChallenge() ?? "",
      refreshToken: authInstance.current?.getRefreshToken() ?? "",
      ...(expiresAt
        ? {
            expiresAt,
            displayExpiresAt: dayjs(expiresAt).format("LLLLZ"),
            displayExpiresIn: dayjs(expiresAt).toNow(),
          }
        : {}),
    }));
    return () => {
      // cleanup
    };
  }, []);

  useEffect(() => {
    let _t: NodeJS.Timeout;
    // console.log("params.codeVerifier", !!params.codeVerifier);
    if (state && code && params.codeVerifier) {
      // (4) Code → token exchange
      const fn = async () =>
        await authInstance.current?.exchangeForAccessToken(location.href);
      fn().then((r) => {
        authInstance.current?.removeCodeVerifier();
        // console.log("cookie", authInstance.current?.getCodeVerifier(false));
        saveRefreshTokenWithResponse(r);
        setParams((p) => ({
          ...p,
          codeVerifier: "",
        }));
      });
    } else if (
      // experimental check to refresh on interval (hacky as the given token expiry is very short so it's almost every second)
      (isExperimental &&
        params.expiresAt &&
        dayjs().isAfter(dayjs(params.expiresAt))) ||
      (!state && !code)
    ) {
      if (isExperimental) {
        // delay the check
        _t = setTimeout(() => {
          // (6) Token → token exchange
          const fn = async () =>
            await authInstance.current?.refreshAccessToken();
          // (5) Saving refresh token in localStorage
          fn().then((r) => saveRefreshTokenWithResponse(r));
        }, 5000);
        return;
      }
      // (6) Token → token exchange
      const fn = async () => await authInstance.current?.refreshAccessToken();
      // (5) Saving refresh token in localStorage
      fn().then((r) => saveRefreshTokenWithResponse(r));
    }
    return () => {
      // cleanup
      clearTimeout(_t);
    };
  }, [
    state,
    code,
    params.codeVerifier,
    saveRefreshTokenWithResponse,
    isExperimental,
    params.expiresAt,
  ]);

  return (
    <div className="flex h-screen w-full">
      <div className="hidden lg:flex items-center justify-center flex-1 bg-white text-black">
        <div className="max-w-md text-center">
          <img src={loginImg} alt="login" height={490} width={640} />
        </div>
      </div>
      <div className="w-full bg-gray-100 lg:w-2/3 flex flex-col">
        <div className="max-h-1/4 lg:hidden bg-white top-0">
          <img src={loginImg} alt="login" className="w-full h-full" />
        </div>
        <div className="p-6 flex-1 flex flex-col justify-center">
          <h1 className="text-3xl font-semibold mb-6 text-black text-center">
            {!params.refreshToken && (
              <button
                type="button"
                className={cx(
                  "text-white bg-blue-700 hover:bg-blue-800 font-medium rounded-lg",
                  "text-xl px-5 py-2.5 me-2 mb-2",
                  "border-0",
                  "cursor-pointer",
                )}
                onClick={() => {
                  // (2) Authorization redirect
                  const authzUrl = authInstance.current?.getAuthorizeUrl({
                    code_challenge: params.codeChallenge,
                  });
                  if (authzUrl) {
                    location.href = authzUrl;
                  }
                }}
                data-testid="btn-login"
              >
                Login
              </button>
            )}
            {params.refreshToken && (
              <button
                type="button"
                className={cx(
                  "text-white bg-gray-700 hover:bg-gray-800 font-medium rounded-lg",
                  "text-xl px-5 py-2.5 me-2 mb-2",
                  "border-0",
                  "cursor-pointer",
                )}
                onClick={logout}
                data-testid="btn-logout"
              >
                Logout
              </button>
            )}
          </h1>
          <section className="break-all">
            <Details
              data={{
                state,
                code,
                ...params,
              }}
              fieldCopy
              fieldClassName="break-all"
            />
          </section>
        </div>
      </div>
    </div>
  );
};

export default App;
