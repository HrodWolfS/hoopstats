import { describe, expect, it } from "vitest";
import { dispatchRequest, isCronAuthorized } from "@/lib/morning-sync";

describe("synchro du matin", () => {
  it("n'accepte que le secret du cron", () => {
    expect(isCronAuthorized("Bearer s3cret", "s3cret")).toBe(true);
    expect(isCronAuthorized("Bearer autre", "s3cret")).toBe(false);
    expect(isCronAuthorized(null, "s3cret")).toBe(false);
    expect(isCronAuthorized("Bearer ", "")).toBe(false);
    expect(isCronAuthorized("Bearer undefined", undefined)).toBe(false);
  });

  it("lance daily-sync.yml sur main", () => {
    const { url, init } = dispatchRequest("t");
    expect(url).toBe("https://api.github.com/repos/HrodWolfS/hoopstats/actions/workflows/daily-sync.yml/dispatches");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ ref: "main" });
  });
});
