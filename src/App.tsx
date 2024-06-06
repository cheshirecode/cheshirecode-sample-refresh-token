/* eslint-disable import/no-named-as-default-member */
import cx from "classnames";

import loginImg from "@/assets/login.svg"; // https://undraw.co/illustrations
import Details from "@/components/Details";
import usePKCE from "@/components/usePKCE";
import { useAuthParams } from "@/services/browser/useOnLoad";

const App = () => {
  const [state, code] = useAuthParams();
  const { params, authInstance, isExperimental, setExperimentalFlag, logout } =
    usePKCE({
      state,
      code,
    });

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
                onClick={() => {
                  logout();
                }}
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
                  const v = !!e?.currentTarget?.checked;
                  setExperimentalFlag(v);
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
