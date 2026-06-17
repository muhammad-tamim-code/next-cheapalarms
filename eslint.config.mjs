import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // Design System Enforcement Rules
    rules: {
      // Warn about hardcoded hex colors in className strings
      "no-restricted-syntax": [
        "warn",
        {
          selector: "Literal[value=/^#[0-9a-fA-F]{3,6}$/]",
          message: "Use design system tokens instead of hardcoded hex colors. Use semantic tokens like 'bg-primary', 'text-foreground', etc.",
        },
      ],
    },
  },
  {
    // Client-side code restrictions - prevent direct WordPress API calls
    files: [
      "src/components/**/*.{js,jsx,ts,tsx}",
      "src/hooks/**/*.{js,jsx,ts,tsx}",
      "src/lib/react-query/**/*.{js,jsx,ts,tsx}",
      "src/pages/**/*.{js,jsx,ts,tsx}",
    ],
    ignores: [
      "src/pages/api/**", // API routes can use wp.server.js
      "src/lib/admin/**", // Admin library files may need server utilities
      "src/lib/api/**", // API utilities can use server files
      "src/lib/auth/**", // Auth utilities may need server files
    ],
    rules: {
      // Prevent importing server-only WordPress utilities in client code
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/wp.server", "**/wp.server.js"],
              message: "wp.server.js is server-only. Use apiFetch() from lib/api/apiFetch.js for client-side API calls.",
            },
            {
              group: ["**/lib/wp"],
              message: "Do not import from lib/wp.js in client code. Use apiFetch() from lib/api/apiFetch.js instead. wp.js only exports TOKEN_COOKIE constant.",
            },
          ],
        },
      ],
      // Prevent direct WordPress API URL usage
      "no-restricted-syntax": [
        "warn",
        {
          selector: "Literal[value=/staging\\.cheapalarms\\.com\\.au/]",
          message: "Do not hardcode WordPress URLs. Use Next.js API routes (/api/*) instead.",
        },
        {
          selector: "Literal[value=/wp-json\\/ca\\/v1/]",
          message: "Do not call WordPress REST API directly. Use Next.js API routes (/api/*) instead.",
        },
        {
          selector: "VariableDeclarator[id.name=/WP_API_BASE|NEXT_PUBLIC_WP_URL/] > Literal[value=/wp-json/]",
          message: "Do not use WP_API_BASE or NEXT_PUBLIC_WP_URL for direct API calls. Use Next.js API routes (/api/*) instead.",
        },
      ],
    },
  },
  {
    // Rules for JSX/TSX files
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      // Allow setState in useEffect for hydration fixes (intentional pattern)
      // Individual suppressions are added where needed
      "react-hooks/set-state-in-effect": "warn",
      // React Compiler memoization warnings are informational - can be ignored
      "react-hooks/preserve-manual-memoization": "warn",
      // Warn about common hardcoded color patterns in className
      "no-restricted-syntax": [
        "warn",
        {
          selector: "TemplateLiteral[expressions.length=0] > TemplateElement[value.raw=/bg-\\[#[0-9a-fA-F]{3,6}\\]/]",
          message: "Avoid hardcoded hex colors in Tailwind classes. Use design system tokens like 'bg-primary', 'bg-secondary', etc.",
        },
        {
          selector: "TemplateLiteral[expressions.length=0] > TemplateElement[value.raw=/text-\\[#[0-9a-fA-F]{3,6}\\]/]",
          message: "Avoid hardcoded hex colors in Tailwind classes. Use design system tokens like 'text-foreground', 'text-primary', etc.",
        },
        {
          selector: "TemplateLiteral[expressions.length=0] > TemplateElement[value.raw=/border-\\[#[0-9a-fA-F]{3,6}\\]/]",
          message: "Avoid hardcoded hex colors in Tailwind classes. Use design system tokens like 'border-border', 'border-primary', etc.",
        },
        // Warn about arbitrary spacing values
        {
          selector: "TemplateLiteral[expressions.length=0] > TemplateElement[value.raw=/[p|m|gap|w|h]-\\[[0-9]+px\\]/]",
          message: "Avoid arbitrary pixel values. Use design system spacing scale (0-24) or layout primitives (Stack, Grid, Spacer).",
        },
        // Warn about arbitrary border radius
        {
          selector: "TemplateLiteral[expressions.length=0] > TemplateElement[value.raw=/rounded-\\[[0-9]+px\\]/]",
          message: "Avoid arbitrary border radius values. Use design system tokens: 'rounded-sm', 'rounded-md', 'rounded-lg', 'rounded-xl'.",
        },
      ],
    },
  },
  {
    // Email templates - disable unescaped entities rule (emails often need quotes/apostrophes)
    files: ["**/email-templates/**"],
    rules: {
      "react/no-unescaped-entities": "off",
    },
  },
  {
    // Portal components - user-facing text with apostrophes/quotes
    files: ["**/portal/**", "**/pages/**", "**/design-system/**"],
    rules: {
      "react/no-unescaped-entities": "off",
    },
  },
]);

export default eslintConfig;
