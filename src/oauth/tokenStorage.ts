import type {OAuthToken} from "../oauth"

export let cookieName = "svelte-oauth-token"
export const setCookieName = (value: string): string => cookieName = value

export type TokenStorage = {
    get(): OAuthToken|null|undefined
    set(token: OAuthToken): void
    remove()
}