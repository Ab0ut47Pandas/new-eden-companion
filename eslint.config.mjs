import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  {
    files: ["src/lib/fitting/core.ts"],
    rules: {
      "@next/next/no-assign-module-variable": "off",
    },
  },
  globalIgnores([".next/**", "coverage/**", "data/**", "next-env.d.ts"]),
]);