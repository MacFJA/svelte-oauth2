import {encode} from "js-base64"

import type {ContextStrategy} from "../../integration"
import {ManInTheMiddle} from "../exception/ManInTheMiddle"
import {BaseGrant} from "../grant"
import type {Grant} from "../grant"

export class AuthorizationCode extends BaseGrant implements Grant
{
    private readonly clientId: string
    private readonly clientSecret: string
    private readonly postLoginRedirectUri: string
    private readonly authorizationRedirectUri: string
    private readonly authorizationUri: string
    private readonly credentialMode: "request" | "header"

    /**
     * @param {ContextStrategy} integration The context strategy to use (How the auth integrate with the app).
     * @param {string} clientId The OAuth2 Client Id
     * @param {string} clientSecret The OAuth2 Client Secret
     * @param {string} postLoginRedirectUri The application URI to go when the user is authenticated.
     * @param {string} tokenUri The Auth Server URI where to get the access token.
     * @param {string} authorizationUri The Auth Server URI where to go for authentication.
     * @param {string} authorizationRedirectUri The application URI to go back from the Auth Server
     * @param {"request"|"header"} credentialMode Where to put credential (Client Id and Client Secret)
     */
    constructor(
        integration: ContextStrategy,
        clientId: string,
        clientSecret: string,
        postLoginRedirectUri: string,
        tokenUri: string,
        authorizationUri: string,
        authorizationRedirectUri: string,
        credentialMode: "request" | "header" = "request"
    ) {
        super(integration, tokenUri)
        this.authorizationRedirectUri = authorizationRedirectUri
        this.authorizationUri = authorizationUri
        this.clientId = clientId
        this.clientSecret = clientSecret
        this.postLoginRedirectUri = postLoginRedirectUri
        this.credentialMode = credentialMode
    }

    async onRequest(): Promise<boolean> {
        const params = await this.integration.query()
        if (params.has("code") && params.has("state")) {
            const state = params.get("state")
            const code = params.get("code")

            if (state !== (await this.integration.getFromTemporary("svelte-oauth-state"))) {
                throw new ManInTheMiddle()
            }

            const tokenParams = {
                grant_type: "authorization_code",
                code: code,
                redirect_uri: this.postLoginRedirectUri
            }
            const tokenHeaders = {}
            if (this.credentialMode === "request") {
                tokenParams["client_id"] = this.clientId
                tokenParams["client_secret"] = this.clientSecret
            } else {
                tokenHeaders["Authorization"] = "Basic " + encode(this.clientId + ":" + this.clientSecret)
            }

            return this.getToken(tokenParams, tokenHeaders).then(async () => {
                await this.integration.redirect(this.postLoginRedirectUri)
                return Promise.resolve(true)
            })
        }
        return super.onRequest()
    }
    async onUnauthenticated(scopes: Array<string>): Promise<void> {
        await super.onUnauthenticated(scopes)
        const url = new URL(this.authorizationUri)
        url.searchParams.append("response_type", "code")
        url.searchParams.append("scope", scopes.join(" "))
        url.searchParams.append("client_id", this.clientId)
        url.searchParams.append("state", await this.generateState(scopes))
        url.searchParams.append("redirect_uri", this.authorizationRedirectUri)

        return this.integration.redirect(url.toString())
    }

    private async generateState(scopes): Promise<string> {
        const state = ((new Date()).getTime() + scopes.join("_")).split("").sort(() => .5 - Math.random()).join("")
        await this.integration.saveInTemporary("svelte-oauth-state", encode(state))
        return encode(state)
    }
}