import { describe, expect, it } from "vitest";
import { changePasswordSchema, loginSchema, safeRedirect } from "./auth.schema";

describe("safeRedirect", () => {
  it("accepts same-origin relative paths", () => {
    expect(safeRedirect("/findings?status=OPEN")).toBe("/findings?status=OPEN");
  });

  it.each([null, "", "https://evil.example", "//evil.example", "/login", "javascript:alert(1)"])(
    "falls back to /overview for %s",
    (next) => {
      expect(safeRedirect(next)).toBe("/overview");
    },
  );
});

describe("auth schemas", () => {
  it("validates login input", () => {
    expect(loginSchema.safeParse({ email: "not-an-email", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: " a@b.co ", password: "x" }).success).toBe(true);
  });

  it("enforces password policy, confirmation and change", () => {
    const base = { currentPassword: "Old!Passw0rd", newPassword: "N3w!Passw0rd", confirmPassword: "N3w!Passw0rd" };
    expect(changePasswordSchema.safeParse(base).success).toBe(true);
    expect(changePasswordSchema.safeParse({ ...base, newPassword: "weak", confirmPassword: "weak" }).success).toBe(
      false,
    );
    expect(changePasswordSchema.safeParse({ ...base, confirmPassword: "Different1!" }).success).toBe(false);
    expect(
      changePasswordSchema.safeParse({
        ...base,
        newPassword: base.currentPassword,
        confirmPassword: base.currentPassword,
      }).success,
    ).toBe(false);
  });
});
