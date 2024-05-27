import cx from "classnames";

import loginImg from "./assets/login.svg"; // https://undraw.co/illustrations

function App() {
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
            >
              Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
