<script lang="ts">
    import Auth from "../../src/index"
    import { init, browserStrategy, AuthorizationCodePKCE, addAuthHeader } from "../../src/index"

    init(
        browserStrategy,
        new AuthorizationCodePKCE(
            browserStrategy,
            '__GITLAB_CLIENT_ID__',
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