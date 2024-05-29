import { useMemo, useSyncExternalStore } from "react";

const getSnapshot = () => window.location;
const subscribe = (callback: () => void) => {
  window?.addEventListener("load", callback);
  return () => {
    window?.removeEventListener("load", callback);
  };
};
const _selector: (x: typeof window.location) => unknown = (x) => x;

const selectAuthParams = (l: Location) => {
  const searchParams = new URLSearchParams(l.search);
  return [searchParams.get("state"), searchParams.get("code")] as const;
};

export const useAuthParams = () => {
  return useOnLoad(selectAuthParams) as ReturnType<typeof selectAuthParams>;
};

export default function useOnLoad(selector = _selector) {
  const _location = useSyncExternalStore(subscribe, getSnapshot);
  const value = useMemo(() => selector(_location), [_location, selector]);

  return value;
}
