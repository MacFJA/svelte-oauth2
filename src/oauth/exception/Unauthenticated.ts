export class Unauthenticated implements Error {
    get message(): string {
        return "Unauthenticated"
    }

    get name(): string {
        return "Unauthenticated"
    }
}
