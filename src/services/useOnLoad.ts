import { useMemo, useSyncExternalStore } from "react";

const getSnapshot = () => window.location;
const subscribe = (callback: () => void) => {
  window?.addEventListener("load", callback);
  return () => {
    window?.removeEventListener("load", callback);
  };
};
const _selector = (x: unknown) => x;

export default function useOnLoad(selector = _selector) {
  const _location = useSyncExternalStore(subscribe, getSnapshot);
  const value = useMemo(() => selector(_location), [_location, selector]);

  return value;
}
