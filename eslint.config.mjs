import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Cost-domain firewall (CLAUDE_FINAL.md I5/I6, HLD.md §3): the free tier
  // has zero Anthropic API calls. Free route-group modules must have no
  // import path to src/lib/ai, enforced at build time, not by discipline.
  {
    files: ["src/app/(free)/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/ai", "@/lib/ai/*", "**/lib/ai", "**/lib/ai/*"],
              message:
                "Free tier modules may not import src/lib/ai (CLAUDE_FINAL.md invariant I5/I6).",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
