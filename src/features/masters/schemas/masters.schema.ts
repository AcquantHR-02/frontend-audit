import { z } from "zod";

const required = (message: string) => z.string().trim().min(1, message);

export const stateSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2,3}$/, "Use the 2–3 letter state code, e.g. KA"),
  name: required("Enter the state name").max(60),
});
export type StateValues = z.infer<typeof stateSchema>;

export const actSchema = z.object({
  shortName: required("Enter a short name, e.g. CLRA").max(20, "Keep it under 20 characters"),
  name: required("Enter the full name of the Act").max(200),
  category: z.string().trim().max(60),
});
export type ActValues = z.infer<typeof actSchema>;

export const principalEmployerSchema = z.object({
  name: required("Enter the display name").max(100),
  legalName: required("Enter the registered legal name").max(200),
});
export type PrincipalEmployerValues = z.infer<typeof principalEmployerSchema>;

export const unitSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{3,20}$/, "Use 3–20 uppercase letters, digits or hyphens, e.g. VOM-JIG"),
  name: required("Enter the unit name").max(100),
  stateId: required("Select the state the unit is located in"),
});
export type UnitValues = z.infer<typeof unitSchema>;

export const closeUnitSchema = z.object({
  closedOn: z
    .string()
    .min(1, "Select the closure date")
    .refine((v) => v <= new Date().toISOString().slice(0, 10), "Closure date can't be in the future"),
});
export type CloseUnitValues = z.infer<typeof closeUnitSchema>;

export const vendorSchema = z.object({
  name: required("Enter the vendor name").max(150),
});
export type VendorValues = z.infer<typeof vendorSchema>;

/** `scope` is "NATIONAL" or a state id (state_id null = NATIONAL, spec §7A Lock 2). */
export const checklistItemSchema = z.object({
  actId: required("Select the Act this requirement belongs to"),
  scope: required("Select a state or National"),
  cadence: z.enum(["LIFETIME", "ONE_TIME", "PERIODIC"], { required_error: "Select a cadence" }),
  description: z.string().trim().min(10, "Describe the requirement (at least 10 characters)").max(500),
});
export type ChecklistItemValues = z.infer<typeof checklistItemSchema>;
