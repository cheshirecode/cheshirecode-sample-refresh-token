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
  // per-component instance of PKCE handler
  const authInstance = useRef<PKCEWrapper | null>(null);
  // store internal state (which map to some stored values in Cookies or LocalStorage, to let React re-renders take place naturally
  // without having to fiddle with Cookies and localStorage event listener
  // note - localStorage event emitter doesn't work on the same page anyway https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event
  // but it is a good extension to track changes across multiple pages in the same browser
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
  const [isExchangeFlow, setIsExchangeFlow] = useState<null | boolean>(null);
  // experimental flag which is currently only used to trigger token auto-refresh
  const [isExperimental, setIsExperimental] = useState(
    localStorage.getItem("__is_experimental") === "true",
  );
  // counter to keep track of how many times token refresh occurs
  const refreshTokenSetCounter = useRef<number>(0);

  // dedicated fn to use refresh token to get new access token to isolate and possibly modify it with
  // throttle/debounce etc
  const refreshAccessToken = useCallback(async () => {
    let r: Awaited<ReturnType<PKCEWrapper["refreshAccessToken"]>> | undefined;
    try {
      r = await authInstance.current?.refreshAccessToken();
      // (5) Saving refresh token in localStorage
      saveRefreshTokenWithResponse(r);
      refreshTokenSetCounter.current++;
    } catch (err) {
      // @ts-ignore
      if (err?.name == "AbortError") {
        // eslint-disable-next-line no-console
        console.log("aborted refresh reqquest");
      }
    }
  }, [saveRefreshTokenWithResponse]);
  // init 1 instance per component to allow logic extraction to hook or child component eventually
  useEffect(() => {
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
  // TODO - decide whether this should be an exchange flow or refresh flow
  // and React Effecst aren't super easy to follow so ideally 2 flows should mean 2 pages/routes
  // or composite states be moved into atomic store to lift them out of the current component (alas this is a demo so TBD)
  useEffect(() => {
    const _isExchange = !!(state && code && params.codeVerifier);
    if (_isExchange !== !!isExchangeFlow) {
      setIsExchangeFlow(_isExchange);
    }
  }, [code, isExchangeFlow, params.codeVerifier, state]);
  // exchange flow - perform token exchange and store the new token
  useEffect(() => {
    if (isExchangeFlow === true) {
      // (4) Code → token exchange
      authInstance.current?.abort(getAuthzConfig().authz_uri);
      const fn = async () =>
        await authInstance.current?.exchangeForAccessToken(location.href);
      try {
        fn().then((r) => {
          authInstance.current?.removeCodeVerifier();
          // console.log("cookie", authInstance.current?.getCodeVerifier(false));
          saveRefreshTokenWithResponse(r);
          setParams((p) => ({
            ...p,
            codeVerifier: "",
          }));
        });
      } catch (err) {
        // @ts-ignore
        if (err?.name == "AbortError") {
          // eslint-disable-next-line no-console
          console.log("aborted exchange request");
        }
      }
    }
    return () => {
      // cleanup
    };
  }, [isExchangeFlow, saveRefreshTokenWithResponse]);
  // refresh flow - perform token refresh and store the new token
  useEffect(() => {
    // console.log("refresh flow", isExchangeFlow, refreshTokenSetCounter.current);
    if (isExchangeFlow === false) {
      // // instead of manually checking stateful counter, we simply cancelled other requests to ensure only 1 is made at a time
      // if (refreshTokenSetCounter.current > 0) {
      //   return;
      // }
      authInstance.current?.abort(getAuthzConfig().token_uri);
      // (6) Token → token exchange
      refreshAccessToken();
    }
    return () => {
      // cleanup
    };
  }, [isExchangeFlow, refreshAccessToken]);
  // 'auto-refresh token' mode - perform automagic refresh
  useEffect(() => {
    let _t: NodeJS.Timeout;
    if (isExperimental && params.refreshToken) {
      const expiresAtDayjs = dayjs(params.expiresAt);
      // do a check every second to see if the expiry time is 10s away (or already passed)
      // then trigger (6). This has a side effect of showing a countdown timer
      // which is pretty neat as long as token lasts at least 15-20s
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
          // abit of an edge case, when calling refresh in a timer we have no way to tell if
          // another refresh was already cancelled, this might cause subsequent requests to
          // also receive the abort signal (see https://javascript.info/fetch-abort#comment-5072436671)
          // so to be safe, just delete the controller here
          authInstance.current?.deleteController(getAuthzConfig().token_uri);
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
