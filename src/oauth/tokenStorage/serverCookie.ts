import { serialize, parse } from "cookie"

import type {OAuthToken} from "../../oauth"
import type {TokenStorage} from "../tokenStorage"

let requestCookies = ""
let responseCookie = ""

export const setRequestCookies = (cookies: string): void => {
    requestCookies = cookies
    responseCookie = ""
}
export const getResponseCookie = (): string => {
    return responseCookie
}

export const serverCookie: TokenStorage = {
    remove() {
        responseCookie = serialize("svelte-oauth-token", "deleted", {
            expires: new Date(0),
            sameSite: "strict"
        })
    },
    get(): OAuthToken | null | undefined {
        const cookies = parse(requestCookies)
        if (!Object.keys(cookies).includes("svelte-oauth-token")) {
            return null
        }

        try {
            return JSON.parse(cookies["svelte-oauth-token"])
        } catch (e) {
            return null
        }
    }, set(token: OAuthToken): void {
        responseCookie = serialize("svelte-oauth-token", JSON.stringify(token), {
            sameSite: "strict"
        })
        requestCookies = responseCookie
    }
}