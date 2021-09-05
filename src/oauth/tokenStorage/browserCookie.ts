import { erase as removeCookie, get as getCookie, set as setCookie } from "browser-cookies"

import type {OAuthToken} from "../../oauth"
import type {TokenStorage} from "../tokenStorage"

export const browserCookie: TokenStorage = {
    remove() {
        removeCookie("svelte-oauth-token", { samesite: "Strict" })
    },
    get(): OAuthToken | null | undefined {
        const value = getCookie("svelte-oauth-token")
        if (value === null) {
            return null
        }

        try {
            return JSON.parse(value)
        } catch (e) {
            return null
        }
    }, set(token: OAuthToken): void {
        setCookie("svelte-oauth-token",
            JSON.stringify(token),
            { samesite: "Strict" }
        )
    }
}