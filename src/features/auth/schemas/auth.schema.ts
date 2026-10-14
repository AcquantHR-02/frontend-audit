import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address")
    .email("Enter a valid email address, e.g. name@company.com"),
  password: z.string().min(1, "Enter your password"),
});
export type LoginValues = z.infer<typeof loginSchema>;

/** Password policy — keep in sync with the backend once it publishes its rules. */
export const passwordRules = [
  { id: "length", label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { id: "upper", label: "One uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { id: "lower", label: "One lowercase letter", test: (v: string) => /[a-z]/.test(v) },
  { id: "digit", label: "One number", test: (v: string) => /\d/.test(v) },
  { id: "special", label: "One special character", test: (v: string) => /[^A-Za-z0-9]/.test(v) },
] as const;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z
      .string()
      .refine((v) => passwordRules.every((rule) => rule.test(v)), "Password doesn't meet all the requirements"),
    confirmPassword: z.string().min(1, "Re-enter the new password"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match",
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ["newPassword"],
    message: "New password must differ from the current one",
  });
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

/** Only same-origin relative paths are accepted as post-login redirects (blocks open redirects). */
export function safeRedirect(next: string | null | undefined, fallback = "/overview") {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login") ? next : fallback;
}
