import { z } from "zod";

/**
 * Public env, validated once at module load. Fails fast with a readable error
 * instead of surfacing as a broken request later.
 * NEXT_PUBLIC_* values are inlined at build time, so each must be referenced explicitly.
 */
const envSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.string().min(1).default("/api"),
  NEXT_PUBLIC_API_MOCKING: z.enum(["enabled", "disabled"]).default("enabled"),
});

const parsed = envSchema.safeParse({
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NEXT_PUBLIC_API_MOCKING: process.env.NEXT_PUBLIC_API_MOCKING,
});

if (!parsed.success) {
  throw new Error(`Invalid environment variables:\n${JSON.stringify(parsed.error.flatten().fieldErrors, null, 2)}`);
}

export const env = {
  apiBaseUrl: parsed.data.NEXT_PUBLIC_API_BASE_URL,
  isMockingEnabled: parsed.data.NEXT_PUBLIC_API_MOCKING === "enabled",
} as const;
