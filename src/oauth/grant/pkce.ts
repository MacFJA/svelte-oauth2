import {encode} from "js-base64"
import {create} from "pkce"

import type {ContextStrategy} from "../../integration"
import {ManInTheMiddle} from "../exception/ManInTheMiddle"
import {BaseGrant} from "../grant"
import type {Grant} from "../grant"
import { debug } from "svelte/internal";

export class AuthorizationCodePKCE extends BaseGrant implements Grant
{
    private readonly clientId: string
    private readonly postLoginRedirectUri: string
    private readonly authorizationRedirectUri: string
    private readonly authorizationUri: string

    /**
     * @param {ContextStrategy} integration The context strategy to use (How the auth integrate with the app).
     * @param {string} clientId The OAuth2 Client Id
     * @param {string} postLoginRedirectUri The application URI to go when the user is authenticated.
     * @param {string} tokenUri The Auth Server URI where to get the access token.
     * @param {string} authorizationUri The Auth Server URI where to go for authentication.
     * @param {string} authorizationRedirectUri The application URI to go back from the Auth Server
     * @param headers optional {Headers} Additional headers that will be passed as part of the bearer token request (e.g. 'X-API-Key')
     */
    constructor(
        integration: ContextStrategy,
        clientId: string,
        postLoginRedirectUri: string,
        tokenUri: string,
        authorizationUri: string,
        authorizationRedirectUri: string,
        headers?: Headers
    ) {
        super(integration, tokenUri, headers)
        this.authorizationRedirectUri = authorizationRedirectUri
        this.authorizationUri = authorizationUri
        this.clientId = clientId
        this.postLoginRedirectUri = postLoginRedirectUri
    }

    async onRequest(): Promise<boolean> {
        const params = await this.integration.query()
        if (params?.has("code") && params?.has("state")) {
            const state = params.get("state")
            const code = params.get("code")

            if (state !== (await this.integration.getFromTemporary("svelte-oauth-state"))) {
                return Promise.reject(new ManInTheMiddle())
            }
            return this.getToken({
                grant_type: "authorization_code",
                code: code,
                client_id: this.clientId,
                redirect_uri: this.postLoginRedirectUri,
                code_verifier: await this.integration.getFromTemporary("svelte-oauth-code-verifier")
            },
                this.headers
            ).then(async () => {
                await this.integration.redirect(this.postLoginRedirectUri)
                return Promise.resolve(true)
            }).catch(reason => {
                console.log(reason)
                return Promise.resolve(false)
            })
        }
        return super.onRequest()
    }
    async onUnauthenticated(scopes: Array<string>): Promise<void> {
        await super.onUnauthenticated(scopes)
        await this.integration.saveInTemporary("svelte-oauth-tries", "0")
        const url = new URL(this.authorizationUri)
        url.searchParams.append("response_type", "code")
        url.searchParams.append("scope", scopes.join(" "))
        url.searchParams.append("client_id", this.clientId)
        url.searchParams.append("state", await this.generateState(scopes))
        url.searchParams.append("redirect_uri", this.authorizationRedirectUri)
        url.searchParams.append("code_challenge", await this.generateCodeChallenge())
        url.searchParams.append("code_challenge_method", "S256")

        return this.integration.redirect(url.toString())
    }

    private async generateState(scopes): Promise<string> {
        const state = ((new Date()).getTime() + scopes.join("_")).split("").sort(() => .5 - Math.random()).join("")
        await this.integration.saveInTemporary("svelte-oauth-state", encode(state))
        return encode(state)
    }
    private async generateCodeChallenge(): Promise<string> {
        const {codeVerifier, codeChallenge} = create(128)
        await this.integration.saveInTemporary("svelte-oauth-code-verifier", codeVerifier)
        return codeChallenge
    }
}