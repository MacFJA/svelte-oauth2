import type { Handle } from "@sveltejs/kit"

import { getTokenStorageType } from "./oauth"
import { getResponseCookie, setRequestCookies } from "./oauth/tokenStorage/serverCookie"

import { browser } from "$app/environment"

/**
 * Handle hooks for SSR
 * @param {import("@sveltejs/kit/types/hooks").ServerRequest} request The server request
 * @param {Function} resolve The request resolver
 */

export const handle: Handle = async ({event, resolve}) => {
    if (getTokenStorageType() === "cookie" && !browser) {
        setRequestCookies(event.request.headers["cookie"] || "")
    }

    const response = await resolve(event)

    return Promise.resolve(response).then((response: Response) => {
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
            response = {
                ...response,
                status: 302,
                body: null
            }

            response.headers.set("location", redirection)
        }

        return response
    })
}
