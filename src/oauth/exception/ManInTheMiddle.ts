export class ManInTheMiddle implements Error {
    get message(): string {
        return "Man in the Middle attack"
    }

    get name(): string {
        return "ManInTheMiddle"
    }
}
