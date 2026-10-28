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
    // A system's code reaches the game only through its hooks (D-448): the engine's dice and time, never its own, nor Node.
    {
        files: ["systems/*/src/**/*.ts", "test/systems/*/src/**/*.ts"],
        rules: {
            "no-restricted-properties": ["error", { object: "Math", property: "random", message: "Roll with the game's roll: the engine's dice." }],
            "no-restricted-globals": ["error", { name: "Date", message: "The game's time comes from the engine." }, { name: "process", message: "A system's code reaches only the game." }],
            "no-restricted-imports": ["error", { patterns: [{ group: ["node:*", "fs", "path"], message: "A system's code reaches only the game, through its hooks." }] }],
            "no-restricted-syntax": [
                "error",
                { selector: "ImportExpression", message: "A system's code reaches only the game, through its hooks." },
                { selector: "MemberExpression[object.name='globalThis']", message: "A system's code reaches only the game, through its hooks." },
            ],
        },
    },
];
