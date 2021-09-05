import type {ServerResponse} from "@sveltejs/kit/types/hooks"
import { get } from "svelte/store"

import {getTokenStorageType} from "./oauth"
import type {TokenStorage} from "./oauth/tokenStorage"
import {browserCookie} from "./oauth/tokenStorage/browserCookie"
import {localStorage} from "./oauth/tokenStorage/localStorage"
import {getResponseCookie, serverCookie, setRequestCookies} from "./oauth/tokenStorage/serverCookie"

const inMemoryStorage: Record<string, string> = {}

export interface ContextStrategy {
    /**
     * Get the request query parameters
     */
    query(): Promise<URLSearchParams>

    /**
     * Redirect to an url
     * @param {string} url
     */
    redirect(url: string): Promise<void>

    /**
     * Get data from an URL (Fetch API)
     * @param {string} uri The URI of the data
     * @param {Record<string,any>} [options] Fetch options
     */
    fetch(uri:string, options?:Record<string, unknown>): Promise<Response>,

    /**
     * Get the storage where token is saved
     */
    tokenStorage(): Promise<TokenStorage>

    /**
     * Get data from the temporary storage
     * @param {string} key The name/key of the data
     */
    getFromTemporary(key: string): Promise<string|null>,

    /**
     * Save data in the temporary storage
     * @param {string} key The name/key of the data
     * @param {string} data The data to save
     */
    saveInTemporary(key: string, data: string): Promise<void>
}

export const svelteKitStrategy: ContextStrategy = new class implements ContextStrategy {
    private fetchFunc
    private redirectedTo = null
    private queryObject: URLSearchParams|null = null

    fetch(uri: string, options?: Record<string, unknown>): Promise<Response> {
        return this.fetchFunc(uri, options)
    }

    async redirect(url: string): Promise<void> {
        const navigation = await import("$app/navigation")
        const env = await import("$app/env")

        if (env.browser) {
            return navigation.goto(url)
        } else {
            this.redirectedTo = url
            return Promise.resolve()
        }
    }

    async query(): Promise<URLSearchParams> {
        if (this.queryObject !== null) {
            return Promise.resolve(this.queryObject)
        }
        const stores = await import("$app/stores")
        return get(stores.page).query
    }

    getRedirection(): string|null {
        const redirection = this.redirectedTo + ""
        this.redirectedTo = null
        return redirection
    }

    /**
     * Set the fetch function to use
     * @param {Function} func
     */
    setFetch(func) {
        this.fetchFunc = func
    }

    /**
     * Set the request Query
     * @param query
     */
    setQuery(query) {
        this.queryObject = query
    }

    async tokenStorage(): Promise<TokenStorage> {
        const env = await import("$app/env")
        if (getTokenStorageType() === "cookie") {
            return env.browser ? browserCookie : serverCookie
        }
        return localStorage
    }

    /**
     * Handle hooks for SSR
     * @param {import("@sveltejs/kit/types/hooks").ServerRequest} request The server request
     * @param {Function} resolve The request resolver
     */
    async handleHook({request, resolve}) {
        const env = await import("$app/env")

        if (getTokenStorageType() === "cookie" && !env.browser) {
            setRequestCookies(request.headers["cookie"] || "")
        }
        /** @type {Promise<ServerResponse>} response */
        const response = resolve(request)

        return Promise.resolve(response).then((response: ServerResponse) => {
            const cookies = getResponseCookie()
            if (cookies !== "") {
                let existing = response.headers["set-cookie"] || []
                if (typeof existing === "string") existing = [existing]
                existing.push(cookies)
                response.headers["set-cookie"] = existing
            }
            const redirection = this.getRedirection()
            if (redirection !== null && redirection !== "null") {
                response.status = 302
                response.headers.location = redirection
                response.body = null
            }
            return response
        })
    }

    async getFromTemporary(key: string): Promise<string | null> {
        const env = await import("$app/env")
        if (!env.browser) {
            return inMemoryStorage[key] || null
        }
        return window.sessionStorage.getItem(key)
    }

    async saveInTemporary(key: string, data: string) {
        const env = await import("$app/env")
        if (!env.browser) {
            inMemoryStorage[key] = data
            return
        }
        return window.sessionStorage.setItem(key, data)
    }

}

export const browserStrategy: ContextStrategy = new class implements ContextStrategy {
    redirect(url: string): Promise<void> {
        window.location.href = url
        return Promise.resolve()
    }
    query(): Promise<URLSearchParams> {
        return Promise.resolve(new URL(window.location.href).searchParams)
    }
    fetch(uri: string, options?: Record<string, unknown>): Promise<Response> {
        return fetch(uri, options)
    }
    tokenStorage(): Promise<TokenStorage> {
        if (getTokenStorageType() === "cookie") {
            return Promise.resolve(browserCookie)
        }
        return Promise.resolve(localStorage)
    }

    getFromTemporary(key: string): Promise<string | null> {
        return Promise.resolve(sessionStorage.getItem(key))
    }

    saveInTemporary(key: string, data: string): Promise<void> {
        sessionStorage.setItem(key, data)
        return Promise.resolve()
    }
}