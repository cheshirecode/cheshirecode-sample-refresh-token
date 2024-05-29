/* eslint-disable import/no-named-as-default-member */
import cx from "classnames";
import dayjs from "dayjs";
import LocalizedFormat from "dayjs/plugin/localizedFormat";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { useCallback, useEffect, useRef, useState } from "react";

import loginImg from "./assets/login.svg"; // https://undraw.co/illustrations
import Details from "./components/Details";
import { getConfig as getAuthzConfig } from "./services/authz";
import { useAuthParams } from "./services/browser/useOnLoad";
import PKCEWrapper from "../lib";
import { TokenResponse } from "../lib/typings";

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
      const expiresAtDayjs = dayjs(expiresAt);
      setParams((p) => ({
        ...p,
        refreshToken,
        accessToken: response?.access_token,
        ...(expiresAt
          ? {
              expiresAt,
              displayExpiresAt: expiresAtDayjs.format(
                "YYYY-MM-DDTHH:mm:ssZ[Z]",
              ),
              displayExpiresIn:
                expiresAtDayjs.diff(dayjs(), "seconds") + " seconds",
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
  const [isExchangeFlow, setIsExchangeFlow] = useState(false);
  const [isExperimental, setIsExperimental] = useState(
    localStorage.getItem("__is_experimental") === "true",
  );
  const refreshTokenSetCounter = useRef<number | null>(0);
  const refreshAccessToken = useCallback(async () => {
    // (6) Token → token exchange
    const r = await authInstance.current?.refreshAccessToken();
    // (5) Saving refresh token in localStorage
    saveRefreshTokenWithResponse(r);
    refreshTokenSetCounter.current++;
  }, [saveRefreshTokenWithResponse]);

  useEffect(() => {
    // init 1 instance per component to allow logic extraction to hook or child component eventually
    authInstance.current = new PKCEWrapper(getAuthzConfig());

    const expiresAt = authInstance.current?.expiresAt;
    const expiresAtTs = dayjs(expiresAt);
    // (1) Generating code challenge and verifier
    setParams((p) => ({
      ...p,
      codeVerifier: authInstance.current?.getCodeVerifier() ?? "",
      codeChallenge: authInstance.current?.generateCodeChallenge() ?? "",
      refreshToken: authInstance.current?.getRefreshToken() ?? "",
      ...(expiresAt
        ? {
            expiresAt,
            displayExpiresAt: expiresAtTs.format("YYYY-MM-DDTHH:mm:ssZ[Z]"),
            displayExpiresIn: expiresAtTs.diff(dayjs(), "seconds") + " seconds",
          }
        : {}),
    }));
    return () => {
      // cleanup
    };
  }, []);

  useEffect(() => {
    // decide whether this should be an exchange flow or refresh flow
    // and React Effecst aren't super easy to follow so ideally 2 flows should mean 2 pages/routes
    // or composite states be moved into atomic store to lift them out of the current component (alas this is a demo so TBD)
    const _isExchange = !!(state && code && params.codeVerifier);
    if (_isExchange !== isExchangeFlow) {
      setIsExchangeFlow(_isExchange);
    }
  }, [code, isExchangeFlow, params.codeVerifier, state]);

  useEffect(() => {
    if (isExchangeFlow) {
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
    }
    return () => {
      // cleanup
    };
  }, [isExchangeFlow, saveRefreshTokenWithResponse]);

  useEffect(() => {
    if (!isExchangeFlow) {
      if (refreshTokenSetCounter.current > 0) {
        return;
      }
      refreshAccessToken();
    }
    return () => {
      // cleanup
    };
  }, [isExchangeFlow, refreshAccessToken]);

  useEffect(() => {
    let _t: NodeJS.Timeout;
    if (isExperimental && params.refreshToken) {
      const expiresAtDayjs = dayjs(params.expiresAt);
      _t = setInterval(() => {
        const now = dayjs();
        setParams((v) => ({
          ...v,
          displayExpiresIn:
            dayjs(v.expiresAt).diff(now, "seconds") + " seconds",
        }));

        if (
          now.isAfter(expiresAtDayjs) ||
          Math.abs(now.diff(expiresAtDayjs, "seconds")) <= 10
        ) {
          refreshAccessToken();
        }
      }, 1000);
    }
    return () => {
      clearTimeout(_t);
    };
  }, [
    refreshAccessToken,
    isExperimental,
    params.refreshToken,
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
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                value=""
                className="sr-only peer"
                checked={isExperimental}
                onChange={(e) => {
                  const v = e.currentTarget.checked;
                  setIsExperimental(() => {
                    localStorage?.setItem(
                      "__is_experimental",
                      v ? "true" : "false",
                    );
                    return v;
                  });
                }}
              />
              <div
                className={cx(
                  "relative w-11 h-6",
                  "bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer",
                  "peer-checked:after:translate-x-full peer-checked:after:border-white",
                  "after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all",
                  " peer-checked:bg-blue-600",
                )}
              ></div>
              <span className="ms-3 text-sm font-medium text-gray-900">
                Refresh token if expired or is expiring soon
              </span>
            </label>
          </h1>
          <section className="break-all">
            <Details
              data={{
                state,
                code,
                ...params,
                // refreshTokenSetCounter: refreshTokenSetCounter?.current,
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
