import commonjs from "@rollup/plugin-commonjs"
import resolve from "@rollup/plugin-node-resolve"
import typescript from "@rollup/plugin-typescript"
import svelte from "rollup-plugin-svelte"

import pkg from "./package.json"

export default {
    input: "src/index.ts",
    output: [
        { file: pkg.module, "format": "es" },
        { file: pkg.main, "format": "umd", name: "Auth" }
    ],
    external: ["$app/navigation", "$app/stores", "$app/environment"],
    plugins: [
        svelte(),
        typescript(),
        commonjs({ignore: ["crypto"]}),
        resolve()
    ]
}