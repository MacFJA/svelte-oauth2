import jsCookie from "js-cookie"

import type {OAuthToken} from "../../oauth"
import type {TokenStorage} from "../tokenStorage"
import {cookieName} from "../tokenStorage"

export const browserCookie: TokenStorage = {
    remove() {
        jsCookie.remove(cookieName, { samesite: "Strict" })
    },
    get(): OAuthToken | null | undefined {
        const value = jsCookie.get(cookieName)
        if (value === null) {
            return null
        }

        try {
            return JSON.parse(value)
        } catch (e) {
            return null
        }
    }, set(token: OAuthToken): void {
        jsCookie.set(cookieName,
            JSON.stringify(token),
            { samesite: "Strict" }
        )
    }
}