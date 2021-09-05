import type {OAuthToken} from "../../oauth"
import type {TokenStorage} from "../tokenStorage"

export const localStorage: TokenStorage = {
    get(): OAuthToken | null | undefined {
        if (typeof window === "undefined" || !Object.keys(window).includes("localStorage")) {
            return undefined
        }
        const value = window.localStorage.getItem("svelte-oauth-token")

        if (value === null) {
            return null
        }

        try {
            return JSON.parse(value)
        } catch (e) {
            return null
        }
    }, set(token: OAuthToken): void {
        if (typeof window === "undefined" || !Object.keys(window).includes("localStorage")) {
            return
        }
        window.localStorage.setItem("svelte-oauth-token", JSON.stringify(token))
    },
    remove() {
        if (typeof window === "undefined" || !Object.keys(window).includes("localStorage")) {
            return
        }
        window.localStorage.removeItem("svelte-oauth-token")
    }
}