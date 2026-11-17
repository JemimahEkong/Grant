import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  {
    files: ["app/**/*.tsx", "components/**/*.tsx"],
    rules: {
      // Client pages fetch real API data on mount. The setState callbacks run
      // after the request resolves, which is the intended external sync.
      "react-hooks/set-state-in-effect": "off",
      "react/no-unescaped-entities": "off",
    },
  },
  globalIgnores([".next/**", "coverage/**", "next-env.d.ts"]),
]);
