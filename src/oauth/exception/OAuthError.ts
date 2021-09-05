export class OAuthError implements Error {
    public readonly message: string

    constructor(message: string) {
        this.message = message
    }

    get name(): string {
        return "OAuthError"
    }
}
