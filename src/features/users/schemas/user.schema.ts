import { z } from "zod";

export const userSchema = z
  .object({
    fullName: z.string().trim().min(1, "Enter the person's full name").max(120),
    email: z.string().trim().toLowerCase().email("Enter a valid email address"),
    role: z.enum(["AUDITOR_ADMIN", "AUDITOR_USER", "VENDOR_USER", "PE_USER"], { required_error: "Select a role" }),
    vendorId: z.string(),
    peId: z.string(),
  })
  .superRefine((v, ctx) => {
    // §18 — party users are scoped to exactly one vendor / PE.
    if (v.role === "VENDOR_USER" && !v.vendorId) {
      ctx.addIssue({ code: "custom", path: ["vendorId"], message: "Select the vendor this user belongs to" });
    }
    if (v.role === "PE_USER" && !v.peId) {
      ctx.addIssue({ code: "custom", path: ["peId"], message: "Select the Principal Employer this user belongs to" });
    }
  });

export type UserValues = z.infer<typeof userSchema>;
