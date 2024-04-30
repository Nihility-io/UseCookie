import { useEffect, useState } from "preact/hooks"
import { CookieOptions, Cookies } from "./cookies.ts"

/**
 * Creates a preact state that stores the value inside a cookie. useCookie updates in response
 * to external cookie updates
 * @param name Cookie name
 * @param defaultValue Default value if the cookie does not exist
 * @param options Cookie options
 * @returns Current cookie value
 */
export function useCookie<T>(name: string, defaultValue: T, options: CookieOptions = {}): [T, (v: T) => void] {
	// Create a preact state with the default value
	const [result, setResult] = useState<T>(defaultValue)

	useEffect(() => {
		// Read the current cookie value
		setResult(Cookies.get(name, defaultValue))

		// Subscribe to changes to the cookie and update the state if changes are detected
		const unsubscribe = Cookies.subscribe<T>(name, (newValue) => {
			setResult(newValue)
		})

		// Unsubscribe on cleanup
		return () => {
			unsubscribe()
		}
	}, [defaultValue])

	// Cookie setter
	const setter = (newValue: T) => {
		Cookies.set(name, newValue, options)
	}

	return [result, setter]
}
