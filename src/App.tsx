import cx from "classnames";
import { useEffect, useRef, useState } from "react";

import loginImg from "./assets/login.svg"; // https://undraw.co/illustrations
import useOnLoad from "./services/useOnLoad";
import PKCEWrapper from "../lib";

const config = {
  redirect_uri: location.href,
  authz_uri: "https://interview-api.vercel.app/api/authorize",
  token_uri: "https://interview-api.vercel.app/api/oauth/token",
  requested_scopes: "*",
};

const AuthInstance = new PKCEWrapper(config);

const App = () => {
  const _window = useOnLoad();
  const _params = useRef<{ state: string | null; code: string | null }>({
    state: null,
    code: null,
  });
  const [params, setParams] = useState<{ state: string; code: string }>({
    state: "",
    code: "",
  });
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    _params.current.state = searchParams.get("state");
    _params.current.code = searchParams.get("code");
  }, []);
  return (
    <div className="flex h-screen w-full">
      <div className="hidden lg:flex items-center justify-center flex-1 bg-white text-black">
        <div className="max-w-md text-center">
          <img src={loginImg} alt="login" height={490} width={640} />
        </div>
      </div>
      <div className="w-full bg-gray-100 lg:w-1/2 flex items-center justify-center">
        <div className="max-w-md w-full p-6">
          <h1 className="text-3xl font-semibold mb-6 text-black text-center">
            Unauth
          </h1>
          <div className="mt-4 text-sm text-gray-600 text-center">
            <button
              type="button"
              className={cx(
                "text-white bg-blue-700 hover:bg-blue-800 font-medium rounded-lg",
                "text-sm px-5 py-2.5 me-2 mb-2",
                "dark:bg-blue-600 dark:hover:bg-blue-700 border-0",
                "cursor-pointer",
              )}
              onClick={() => {
                location.href = AuthInstance.getAuthorizeUrl();
              }}
            >
              Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
