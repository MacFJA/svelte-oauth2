<script context="module">
    import { init, svelteKitStrategy, AuthorizationCodePKCE, runOAuth2Process, addAuthHeader, isAuthorized } from "../../../../dist/index"

    const scopes = ['read_user'];

    export const load = async ({fetch, page}) => {
        svelteKitStrategy.setFetch(fetch)
        svelteKitStrategy.setQuery(page.query)
        init(
            svelteKitStrategy,
            new AuthorizationCodePKCE(
                svelteKitStrategy,
                '__GITLAB_CLIENT_ID__',
                'http://localhost:3000/',
                'https://gitlab.com/oauth/token',
                'https://gitlab.com/oauth/authorize',
                'http://localhost:3000/',
            )
        )
        try {
            let auth = await runOAuth2Process(scopes)
            let username;
            if (await isAuthorized(scopes)) {
                username = await getUserName()
            }
            return {
                props: {
                    authentication: auth,
                    username
                }
            }
        } catch (e) {
            return {
                props: {
                    authentication: Promise.reject(e),
                }
            }
        }

    }

    const getUserName = () => {
        return addAuthHeader().then(headers => {
            return fetch('https://gitlab.com/api/v4/user', { headers })
                .then(response => response.json())
                .then(response => response.username)
        })
    }
</script>

<script>
    import Auth from "../../../../src/Component.svelte"

    export let authentication
    export let username
    const getUserNameBrowser = () => {
        if (username !== undefined) return
        getUserName().then(value => username = value)
    }
</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation</p>

<Auth scopes={['read_user']} on:authenticated={getUserNameBrowser} {authentication}>
    <div slot="loading">Loading...</div>
    <div slot="error" let:error>{error.message}</div>
    Hello {username}!
</Auth>