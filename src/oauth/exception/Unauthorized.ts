export class Unauthorized implements Error {
    get message(): string {
        return "Unauthorized to access to the resource"
    }

    get name(): string {
        return "Unauthorized"
    }
}
