// @deno-types="npm:@types/js-cookie@3.0.6"
import JSCookies from "js-cookie"

type CookieSubscriber<T = unknown> = (value: T, oldValue: T) => void
type CookieUnsubscriber = () => void

export interface CookieOptions {
	/**
	 * Define when the cookie will be removed. Value can be a Number
	 * which will be interpreted as days from time of creation or a
	 * Date instance. If omitted, the cookie becomes a session cookie.
	 */
	expires?: number | Date

	/**
	 * Define the path where the cookie is available. Defaults to '/'
	 */
	path?: string

	/**
	 * Define the domain where the cookie is available. Defaults to
	 * the domain of the page where the cookie was created.
	 */
	domain?: string

	/**
	 * A Boolean indicating if the cookie transmission requires a
	 * secure protocol (https). Defaults to false.
	 */
	secure?: boolean

	/**
	 * Asserts that a cookie must not be sent with cross-origin requests,
	 * providing some protection against cross-site request forgery
	 * attacks (CSRF)
	 */
	sameSite?: "strict" | "Strict" | "lax" | "Lax" | "none" | "None"

	/**
	 * An attribute which will be serialized, conformably to RFC 6265
	 * section 5.2.
	 */
	[property: string]: unknown
}

/**
 * Interact with cookies and subscribe to changes. Cookies intercepts calls to document.cookie
 * in order to notify subscribers when a cookie has changed.
 * It uses js-cookie under the hood
 */
export class Cookies {
	// Log interceptions if set to true
	public static debug = true

	// Stores all subscribers for specific cookie names
	static #subscribers: Record<string, CookieSubscriber[]> = {}

	// Keeps track if the interceptor has already been installed
	static #isIntercepting = false

	// Intercepts calls to document.cookie in order to notify subscribers
	static #startIntercepting() {
		// Return if the interceptor is ready installed
		if (this.#isIntercepting) {
			return
		}

		// Only use interception if cookies are enabled
		if (!navigator.cookieEnabled) {
			return
		}

		// Save the original cookie functionality
		const original = Object.getOwnPropertyDescriptor(Document.prototype, "cookie")!
		const getCookie = original.get?.bind(document)!
		const setCookie = original.set?.bind(document)!

		// If the descriptor is not configurable, interception won't work
		if (!original.configurable) {
			console.log("[Cookie Interception] Cannot react to cookie changes, because interception has been blocked.")
			return
		}

		if (Cookies.debug) {
			console.log(
				`[Cookie Interception] Start intercepting cookies`,
			)
		}

		// Install the interceptor
		Object.defineProperty(document, "cookie", {
			configurable: true,
			// Do not intercept cookie reading
			get: getCookie,

			// Intercept cookie writing
			set: function setter(value: string) {
				// Ignore invalid values
				if (!value.includes("=")) {
					return setCookie(value)
				}

				// Extract the cookie name
				const name = value.substring(0, value.indexOf("="))

				// Get the old cookie value
				const oldValue = Cookies.get(name, null as unknown)

				// Write the cookie using the original function
				setCookie(value)

				// Get the new cookie value
				const newValue = Cookies.get(name, null as unknown)

				// Log interception
				if (Cookies.debug) {
					console.log(
						`[Cookie Interception] Name: ${name}; Old Value: ${JSON.stringify(oldValue)}; New Value: ${
							JSON.stringify(newValue)
						}`,
					)
				}

				// Notify subscribers
				Cookies.#subscribers[name]?.forEach((f) => f(newValue, oldValue))
			},
		})

		Cookies.#isIntercepting = true
	}

	/**
	 * Subscribes to changes to a cookie with a given name
	 * @param name Cookie name
	 * @param f Subscriber function
	 * @returns Unsubscribe function
	 */
	public static subscribe<T>(name: string, f: CookieSubscriber<T>): CookieUnsubscriber {
		// Start interception cookie writes once the first subscriber is added
		Cookies.#startIntercepting()

		// Store the subscriber function
		if (!(name in Cookies.#subscribers)) {
			Cookies.#subscribers[name] = []
		}
		Cookies.#subscribers[name].push(f as CookieSubscriber<unknown>)

		// Returns an unsubscribe function
		return () => {
			Cookies.#subscribers[name].splice(Cookies.#subscribers[name].indexOf(f as CookieSubscriber<unknown>))
		}
	}

	/**
	 * Reads and parse a cookie with a given name.
	 * Note: Cookie values prefixed with "json:" will be parsed using JSON.parse
	 * @param name Cookie name
	 * @param defaultValue Default value if the cookie does not exist
	 * @returns Parsed cookie value or default value if the cookie does not exist
	 */
	public static get<T>(name: string, defaultValue: T): T {
		const res = JSCookies.get(name)

		// Return the default value if cookie was not found
		if (res === undefined) {
			return defaultValue
		}

		// Parse cookies that as serialized
		if (res.startsWith("json:")) {
			return JSON.parse(res.slice(5))
		}

		return res as unknown as T
	}

	/**
	 * Writes a cookie with a give name.
	 * Note: If a non-string value is given it is serialized using JSON.stringify and
	 * prefixed with "json:" in order to distinguish it from normal cookies.
	 * @param name Cookie name
	 * @param value Cookie value as a string or as a JSON serializable object
	 * @param options Cookie options
	 */
	public static set<T>(name: string, value: T, options: CookieOptions = {}) {
		if (value === undefined) {
			JSCookies.remove(name, options)
		} else if (typeof value === "string") {
			JSCookies.set(name, value, options)
		} else {
			JSCookies.set(name, `json:${JSON.stringify(value)}`, options)
		}
	}
}
