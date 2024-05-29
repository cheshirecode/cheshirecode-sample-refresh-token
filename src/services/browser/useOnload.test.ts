/**
 * @vitest-environment jsdom
 */

import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import useOnLoad, { useAuthParams } from "./useOnLoad";

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
      expect(result.current).toEqual(["http://localhost/", ""]);
    });
  });
  it("useAuthParams", async () => {
    location.href = "https://localhost?state=1&code=2";
    const { result } = renderHook(() => useAuthParams());
    await waitFor(() => {
      expect(result.current).toEqual(["1", "2"]);
    });
  });
});
