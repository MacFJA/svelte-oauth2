import type {OAuthToken} from "../oauth"

export type TokenStorage = {
    get(): OAuthToken|null|undefined
    set(token: OAuthToken): void
    remove()
}