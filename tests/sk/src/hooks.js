import { svelteKitStrategy } from "../../../dist/index"

export async function handle({ request, resolve }) {
    return svelteKitStrategy.handleHook({request, resolve})
}