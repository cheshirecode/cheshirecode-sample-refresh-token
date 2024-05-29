/**
 * @vitest-environment jsdom
 */

import { renderHook, waitFor } from "@testing-library/react";
// import { JSDOM } from "jsdom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import useOnLoad from "./useOnLoad";
// const jsdom = new JSDOM(``, {
//   url: `${location.href}foo?bar=1`,
// });

// beforeEach(() => {
//   jsdom.reconfigure({
//     url: `${location.href}foo?bar=1`,
//   });
// });

describe("useOnLoad", () => {
  it("default to window.location", async () => {
    const { result } = renderHook(() => useOnLoad());
    await waitFor(() => {
      expect(result.current).toHaveProperty("href");
    });
  });
  it("can select subset of location", async () => {
    const { result } = renderHook(() =>
      useOnLoad((l) => [(l as Location).href, (l as Location).search]),
    );
    await waitFor(() => {
      expect(result.current).toEqual(["http://localhost:3000/", ""]);
    });
  });
});
