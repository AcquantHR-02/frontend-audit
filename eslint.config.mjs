import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/** Deep imports into a feature are forbidden everywhere: use its public `index.ts`. */
const featureDeepImport = {
  group: ["@/features/*/*"],
  message: "Import from the feature's public API (`@/features/<name>`), not its internal folders.",
};

/** Lower layers must never depend on features or routes (one-way: app → features → shared). */
const sharedLayerRestriction = {
  group: ["@/features", "@/features/*", "@/app", "@/app/*"],
  message: "Shared layers (components, lib, store, types, hooks, config) must not import features or routes.",
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "no-restricted-imports": ["error", { patterns: [featureDeepImport] }],
      "@typescript-eslint/consistent-type-imports": ["warn", { fixStyle: "inline-type-imports" }],
    },
  },
  {
    files: [
      "src/components/**",
      "src/lib/**",
      "src/store/**",
      "src/types/**",
      "src/hooks/**",
      "src/config/**",
      "src/mocks/**",
    ],
    rules: {
      "no-restricted-imports": ["error", { patterns: [featureDeepImport, sharedLayerRestriction] }],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "public/mockServiceWorker.js"]),
]);

export default eslintConfig;
