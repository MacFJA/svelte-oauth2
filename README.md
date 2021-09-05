# Svelte (and SvelteKit) OAuth2

Add OAuth2 authorization in Svelte 

## Installation

```
npm install @macfja/svelte-oauth2
```

## Examples

### Svelte

```html
<script>
    import Auth, { init, browserStrategy, AuthorizationCodePKCE, addAuthHeader } from "@macfja/svelte-oauth2"

    init(
        browserStrategy,
        new AuthorizationCodePKCE(
            browserStrategy,
            '$$gitlab client id$$',
            'http://localhost:5000/',
            'https://gitlab.com/oauth/token',
            'https://gitlab.com/oauth/authorize',
            'http://localhost:5000/',
        )
    )

    let username
    const getUserName = () => {
        addAuthHeader().then(headers => {
            fetch('https://gitlab.com/api/v4/user', { headers })
                .then(response => response.json())
                .then(response => username = response.username)
        })
    }
</script>

<Auth scopes={['read_user']} on:authenticated={getUserName}>
    <div slot="loading">Loading...</div>
    <div slot="error" let:error>{error.message}</div>
    Hello {username}!
</Auth>
```

### SvelteKit

`src/hooks.js`
```javascript
import { svelteKitStrategy } from "@macfja/svelte-oauth2"

export async function handle({ request, resolve }) {
    return svelteKitStrategy.handleHook({request, resolve})
}
```
`src/routes/index.html`
```html
<script context="module">
    import { init, svelteKitStrategy, AuthorizationCodePKCE, runOAuth2Process } from "@macfja/svelte-oauth2"

    const scopes = ['read_user'];

    export const load = async ({fetch, page}) => {
        svelteKitStrategy.setFetch(fetch)
        svelteKitStrategy.setQuery(page.query)
        init(
            svelteKitStrategy,
            new AuthorizationCodePKCE(
                svelteKitStrategy,
                '$$gitlab client id$$',
                'http://localhost:3000/',
                'https://gitlab.com/oauth/token',
                'https://gitlab.com/oauth/authorize',
                'http://localhost:3000/',
            )
        )
        try {
            return {
                props: { authentication: await runOAuth2Process(scopes) }
            }
        } catch (e) {
            return {
                props: { authentication: Promise.reject(e) }
            }
        }
    }
</script>
<script>
    import Auth, { addAuthHeader } from "@macfja/svelte-oauth2"

    export let authentication
    /*
     For the example purpose this is done in the browser, but can also be done in SSR
     See below.
     */
    let username
    const getUserName = () => {
        addAuthHeader().then(headers => {
            fetch('https://gitlab.com/api/v4/user', { headers })
                .then(response => response.json())
                .then(response => username = response.username)
        })
    }
</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation</p>

<Auth scopes={['read_user']} on:authenticated={getUserName}>
    <div slot="loading">Loading...</div>
    <div slot="error" let:error>{error.message}</div>
    Hello {username}!
</Auth>
```

### SvelteKit full SSR
`src/hooks.js`
```javascript
import { svelteKitStrategy } from "@macfja/svelte-oauth2"

export async function handle({ request, resolve }) {
    return svelteKitStrategy.handleHook({request, resolve})
}
```
`src/routes/index.html`
```html
<script context="module">
    import { init, svelteKitStrategy, AuthorizationCodePKCE, runOAuth2Process, addAuthHeader, isAuthorized } from "@macfja/svelte-oauth2"

    const scopes = ['read_user'];

    export const load = async ({fetch, page}) => {
        svelteKitStrategy.setFetch(fetch)
        svelteKitStrategy.setQuery(page.query)
        init(
            svelteKitStrategy,
            new AuthorizationCodePKCE(
                svelteKitStrategy,
                '$$gitlab client id$$',
                'http://localhost:3000/',
                'https://gitlab.com/oauth/token',
                'https://gitlab.com/oauth/authorize',
                'http://localhost:3000/',
            )
        )
        try {
            const auth = await runOAuth2Process(scopes)
            let username;
            if (await isAuthorized(scopes)) {
                username = await getUserName()
            }
            return {
                props: { authentication: auth, username }
            }
        } catch (e) {
            return {
                props: { authentication: Promise.reject(e) }
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
    import Auth from "@macfja/svelte-oauth2"

    export let authentication
    export let username
    const onAuth = () => {
        if (username !== undefined) return
        getUserName().then(value => username = value)
    }
</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation</p>

<Auth scopes={['read_user']} on:authenticated={onAuth}>
    <div slot="loading">Loading...</div>
    <div slot="error" let:error>{error.message}</div>
    Hello {username}!
</Auth>
```

## Available Grant

### Client Credential

Implementation of [Client Credential](https://oauth.net/2/grant-types/client-credentials/) flow
```javascript
import { ClientCredentials } from "@macfja/svelte-oauth2"
new ClientCredentials(
    contextStrategy, // The context strategy to use (How the auth integrate with the app), Svelte/Browser or SvelteKit
    'Client Id', // The OAuth2 Client Id
    'Client Secret', // The OAuth2 Client Secret
    'Token Uri', // The Auth Server URI where to get the access token.
    'Post Authenticate Uri', // The application URI to go when the user is authenticated.
    credentialMode, // Where to put credential (Client Id and Client Secret). "request" or "header"
)
```

### Authorization Code

Implementation of [Authorization Code](https://oauth.net/2/grant-types/authorization-code/) flow
```javascript
import { AuthorizationCode } from "@macfja/svelte-oauth2"
new AuthorizationCode(
    contextStrategy, // The context strategy to use (How the auth integrate with the app), Svelte/Browser or SvelteKit
    'Client Id', // The OAuth2 Client Id
    'Client Secret', // The OAuth2 Client Secret
    'Post Login Redirect Uri', // The application URI to go when the user is authenticated.
    'Token Uri', // The Auth Server URI where to get the access token.
    'Post Authenticate Uri', // The application URI to go when the user is authenticated.
    'Authorization Redirect Uri', // The application URI to go back from the Auth Server
    credentialMode, // Where to put credential (Client Id and Client Secret). "request" or "header"
)
```

### Authorization Code With PKCE

Implementation of [PKCE](https://oauth.net/2/pkce/) flow
```javascript
import { AuthorizationCodePKCE } from "@macfja/svelte-oauth2"
new AuthorizationCodePKCE(
    contextStrategy, // The context strategy to use (How the auth integrate with the app), Svelte/Browser or SvelteKit
    'Client Id', // The OAuth2 Client Id
    'Post Login Redirect Uri', // The application URI to go when the user is authenticated.
    'Token Uri', // The Auth Server URI where to get the access token.
    'Post Authenticate Uri', // The application URI to go when the user is authenticated.
    'Authorization Redirect Uri', // The application URI to go back from the Auth Server
)
```

## Contributing

Contributions are welcome. Please open up an issue or create PR if you would like to help out.

Read more in the [Contributing file](CONTRIBUTING.md)

## License

The MIT License (MIT). Please see [License File](LICENSE.md) for more information.