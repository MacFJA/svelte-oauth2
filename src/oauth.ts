import type {ContextStrategy} from "./integration"
import {NotImplemented} from "./oauth/exception/NotImplemented"
import {Unauthorized} from "./oauth/exception/Unauthorized"
import type {Grant} from "./oauth/grant"

let tokenStorageType:"cookie"|"localStorage" = "cookie"

let oauthIntegration: ContextStrategy
let oauthGrant: Grant
let initDoneResolve: boolean | (() => void) = false

/**
 * Setup the OAuth
 *
 * @param {ContextStrategy} integration The context strategy to use (How the auth integrate with the app). The existing flavor: SvelteKit, and normal Svelte (browser side only)
 * @param {Grant} grant The OAuth grant type (Client Credentials, Authorization Code, Authorization Code with PKCE)
 * @param {"cookie"|"localStorage"} storage Where to store the OAuth token (default: cookie)
 */
export const init = (integration: ContextStrategy, grant: Grant, storage: "cookie"|"localStorage" = "cookie"): void => {
    oauthGrant = grant
    oauthIntegration = integration
    tokenStorageType = storage
    if (initDoneResolve === true) {
        return
    }
    if (typeof initDoneResolve === "function") {
        initDoneResolve()
    } else {
        initDoneResolve = true
    }
}

export const initDone = (): Promise<void> => {
    if (initDoneResolve === true) {
        return Promise.resolve()
    }
    return new Promise<void>(resolve => {
        initDoneResolve = resolve
    })
}

export const getGrant = (): Grant => oauthGrant
export const getTokenStorageType = ():"cookie"|"localStorage" => tokenStorageType

/**
 * Representation of an OAuth (Access) Token
 */
export type OAuthToken = {
    access_token: string
    token_type: string
    expires_in?: number
    refresh_token?: string
    scope?: string
}

/**
 * Indicate if token exist in the storage
 *
 * @return {Promise<boolean>}
 */
export const hasToken = async (): Promise<boolean> => {
    const tokenData: OAuthToken | undefined = (await oauthIntegration.tokenStorage()).get()

    return tokenData !== undefined && tokenData !== null
}

/**
 * Indicate if token in the storage is expired.
 *
 * (A token that don"t have an expiration date is never expired)
 *
 * @return {Promise<boolean>}
 */
export const tokenExpired = async (): Promise<boolean> => {
    const tokenData: OAuthToken | undefined = (await oauthIntegration.tokenStorage()).get()
    const now = (new Date()).getTime() / 1000

    if (tokenData === undefined || tokenData === null) return false

    return Object.keys(tokenData).includes("expires_in") && tokenData.expires_in < now
}
export const refreshToken = (): void => {
    throw new NotImplemented("Refresh token not implemented")
}

/**
 * Check if the provided scopes are defined in the stored token
 *
 * @param {Array<string>} scopes List of scopes to check
 *
 * @return {Promise<boolean>}
 */
export const isAuthorized = async (scopes: Array<string>): Promise<boolean> => {
    const tokenData: OAuthToken | null = (await oauthIntegration.tokenStorage()).get()

    if (tokenData === null) {
        return null
    }

    const tokenScopes = tokenData.scope.split(" ")

    const intersection = (array1, array2) => {
        return array1.filter(item => array2.includes(item))
    }

    return intersection(scopes, tokenScopes).length === scopes.length
}

/**
 * Add authorization header with the stored token
 *
 * @param {Headers} headers
 *
 * @return {Promise<Headers>}
 */
export const addAuthHeader = async (headers?: Headers): Promise<Headers> => {
    if (headers === undefined) {
        headers = new Headers()
    }
    headers.set("Authorization", `Bearer ${(await oauthIntegration.tokenStorage()).get().access_token || ""}`)

    return headers
}

export const runOAuth2Process = async (scopes: Array<string>): Promise<unknown> => {
    try {
        await initDone()
        await getGrant().onRequest()
        if (!(await hasToken())) {
            return await getGrant().onUnauthenticated(scopes)
        } else if (await tokenExpired()) {
            return refreshToken()
        } else if (!(await isAuthorized(scopes))) {
            return Promise.reject(new Unauthorized())
        } else {
            return true
        }
    } catch (e) {
        return Promise.reject(e)
    }
}