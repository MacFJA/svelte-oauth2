import {encode} from "js-base64"

import type {ContextStrategy} from "../../integration"
import {BaseGrant} from "../grant"
import type {Grant} from "../grant"

export class ClientCredentials extends BaseGrant implements Grant
{
    private readonly postAuthenticateUri: string
    private readonly clientId: string
    private readonly clientSecret: string
    private readonly credentialMode: "header" | "request" = "request"

    /**
     * @param {ContextStrategy} integration The context strategy to use (How the auth integrate with the app).
     * @param {string} clientId The OAuth2 Client Id
     * @param {string} clientSecret The OAuth2 Client Secret
     * @param {string} tokenUri The Auth Server URI where to get the access token.
     * @param {string} postAuthenticateUri The application URI to go when the user is authenticated.
     * @param {"request"|"header"} credentialMode Where to put credential (Client Id and Client Secret)
     */
    constructor(integration: ContextStrategy, tokenUri: string, postAuthenticateUri: string, clientId: string, clientSecret: string, credentialMode: "header"|"request"="request") {
        super(integration, tokenUri)
        this.clientId = clientId
        this.clientSecret = clientSecret
        this.credentialMode = credentialMode
        this.postAuthenticateUri = postAuthenticateUri
    }
    async onUnauthenticated(scopes: Array<string>): Promise<void> {
        await super.onUnauthenticated(scopes)
        const headers = {}
        const params = {
            "response_type": "client_credentials",
            "scope": scopes.join(" "),
        }
        if (this.credentialMode === "request") {
            params["client_id"] = this.clientId
            params["client_secret"] = this.clientSecret
        } else {
            headers["Authorization"] = "Basic " + encode(this.clientId + ":" + this.clientSecret)
        }

        await this.getToken(params, headers)
        return
    }

}