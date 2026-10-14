import stylistic from "@stylistic/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";

// Only the layout rules dprint cannot apply: braces always, a blank line around block statements, at most one blank line.
export default [
    { ignores: ["**/dist/", "node_modules/", "sandbox/", "tmp/"] },
    {
        files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.mjs"],
        languageOptions: { parser: typescriptParser },
        plugins: { "@stylistic": stylistic },
        rules: {
            curly: ["error", "all"],
            "@stylistic/padding-line-between-statements": [
                "error",
                { blankLine: "always", prev: "*", next: "block-like" },
                { blankLine: "always", prev: "block-like", next: "*" },
            ],
            "@stylistic/no-multiple-empty-lines": ["error", { max: 1, maxBOF: 0, maxEOF: 0 }],
        },
    },
];
