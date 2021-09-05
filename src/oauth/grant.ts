import type {ContextStrategy} from "../integration"

import {OAuthError} from "./exception/OAuthError"
import {Unauthenticated} from "./exception/Unauthenticated"

export interface Grant {
    /**
     * Actions to do when a user is not authenticated.
     *
     * (Start the authentication process)
     *
     * @param {Array<string>} scopes List of need scopes
     */
    onUnauthenticated(scopes: Array<string>): Promise<void>

    /**
     * Actions to do on every request that need authorization
     */
    onRequest(): Promise<boolean>
}

/**
 * @internal
 */
export abstract class BaseGrant implements Grant {
    protected integration: ContextStrategy
    private tokenUri: string

    constructor(integration: ContextStrategy, tokenUri: string) {
        this.integration = integration
        this.tokenUri = tokenUri
    }

    protected getToken(params: Record<string, unknown>, headers: HeadersInit = {}): Promise<boolean> {
        const requestHeader = new Headers(headers)
        requestHeader.set("content-type", "application/json")

        return this.integration.fetch(this.tokenUri, {
            method: "post",
            body: JSON.stringify(params),
            headers: requestHeader
        })
            .then((response) => response.json())
            .then(async (response) => {
                if (Object.keys(response).includes("error")) {
                    (await this.integration.tokenStorage()).set(null)
                    throw new OAuthError(response.error_description)
                } else {
                    (await this.integration.tokenStorage()).set(response)
                }
                return response
            })
    }

    onRequest(): Promise<boolean> {
        return Promise.resolve(true)
    }

    async onUnauthenticated(scopes: Array<string>): Promise<void> {// eslint-disable-line @typescript-eslint/no-unused-vars
        const tries = parseInt(await this.integration.getFromTemporary("svelte-oauth-tries") || "0")
        if (tries > 5) {
            throw new Unauthenticated()
        }
        await this.integration.saveInTemporary("svelte-oauth-tries", (tries + 1) + "")

        return null
    }
}