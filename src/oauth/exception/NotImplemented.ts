export class NotImplemented implements Error {
    public readonly message: string

    constructor(message: string) {
        this.message = message
    }

    get name(): string {
        return "NotImplemented"
    }
}
