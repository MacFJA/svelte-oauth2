import baseConfig from './rollup.config'
import replace from "@macfja/rollup-plugin-prompt-replace"


baseConfig.input = 'tests/svelte/App.svelte';
baseConfig.output = [
    { file: 'tests/svelte/build/app.js', 'format': 'iife', name: 'app' }
];
baseConfig.plugins = [...baseConfig.plugins, replace({'__GITLAB_CLIENT_ID__': 'Gitlab client id: '})]

export default baseConfig;