import { debug } from "svelte/internal"

import { getTokenStorageType } from "./oauth"
import type { TokenStorage } from "./oauth/tokenStorage"
import { browserCookie } from "./oauth/tokenStorage/browserCookie"
import { localStorage } from "./oauth/tokenStorage/localStorage"
import { getResponseCookie, serverCookie, setRequestCookies } from "./oauth/tokenStorage/serverCookie"

import { browser } from "$app/environment"

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
    redirect(url: string): Promise<void>,

    /**
     * Get the storage where token is saved
     */
    tokenStorage(): Promise<TokenStorage>

    /**
     * Get data from the temporary storage
     * @param {string} key The name/key of the data
     */
    getFromTemporary(key: string): Promise<string | null>,

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
    private queryObject: URLSearchParams | null = null

    async redirect(url: string): Promise<void> {
        const navigation = await import("$app/navigation")

        if (browser) {
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

        // Old version
        // const stores = await import("$app/stores")
        // return get(stores.page).query

        // New version, except the page store is a Readable and can only be subscribed
        // const page = getStores().page
        // return page.url.searchParams
    }

    getRedirection(): string | null {
        const redirection = this.redirectedTo + ""
        this.redirectedTo = null
        return redirection
    }

    /**
     * Set the request Query
     * @param query
     */
    setQuery(query) {
        this.queryObject = query
    }

    async tokenStorage(): Promise<TokenStorage> {
        if (getTokenStorageType() === "cookie") {
            return browser ? browserCookie : serverCookie
        }
        return localStorage
    }

    /**
     * Handle hooks for SSR
     * https://kit.svelte.dev/docs/types#sveltejs-kit-handle
     */
    async handleHook({event, resolve}) {
        if (getTokenStorageType() === "cookie" && !browser) {
            setRequestCookies(event.request.headers["cookie"] || "")
        }

        const response = await resolve(event)

        const cookies = getResponseCookie()
        if (cookies !== "") {
            let existing = response.headers["set-cookie"] || []
            if (typeof existing === "string") existing = [existing]
            existing.push(cookies)
            response.headers.set("set-cookie", existing)
        }

        // eslint-disable @typescript-eslint/ban-ts-comment
        // @ts-ignore: Object is possibly 'undefined'.
        const redirection = this.getRedirection()

        if (redirection !== null && redirection !== "null") {
            return new Response(null, {
                status: 302,
                headers: {
                    ...response.headers,
                    location: redirection
                }
            })
        }

        return response
    }

    async getFromTemporary(key: string): Promise<string | null> {
        if (!browser) {
            return inMemoryStorage[key] || null
        }
        return window.sessionStorage.getItem(key)
    }

    async saveInTemporary(key: string, data: string) {
        if (!browser) {
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