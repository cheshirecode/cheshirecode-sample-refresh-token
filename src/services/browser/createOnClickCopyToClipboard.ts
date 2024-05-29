// @unocss-include
import type { MouseEvent } from "react";

export default function createOnClickCopyToClipboard(
  v: string,
  params: {
    preventDefault: boolean;
  } = {
    preventDefault: false,
  },
) {
  return async (e: MouseEvent) => {
    if (params.preventDefault) {
      e?.preventDefault();
    }
    const n =
      navigator?.clipboard &&
      (await navigator.permissions.query({
        // @ts-expect-error
        name: "clipboard-write",
      }));
    if (n?.state === "granted") {
      // localhost - open chrome://flags/ in Chrome and add origin to "Insecure origins treated as secure"
      return await navigator?.clipboard?.writeText(v);
    }
    // https://stackoverflow.com/a/30810322
    if (
      document.queryCommandSupported &&
      document.queryCommandSupported("copy")
    ) {
      // create a temp DOM element by write to it then do a fake Ctrl/Cmd+C
      let textArea;
      try {
        textArea = document.createElement("textarea");
        textArea.textContent = v;
        textArea.className =
          "h-1 w-1 top-1 left-1 p-0 m-0 border-0 bg-transparent outline-none fixed";
        document.body.appendChild(textArea);
        textArea.select();
        const msg = document.execCommand("copy"); // Security exception may be thrown by some browsers.
        return msg;
      } catch (ex) {
        // eslint-disable-next-line no-console
        console.error("Copy to clipboard failed.", ex);
        return false;
      } finally {
        // clean up the temporary DOM element
        if (textArea) {
          document.body.removeChild(textArea);
        }
      }
    }
    return false;
  };
}
