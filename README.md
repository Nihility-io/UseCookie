# UseCookie
Easily persist state in preact using cookies

## Example Usage
```tsx
import { useCookie } from "jsr:@nihility-io/use-cookie"

export const MyComponent = () => {
	const [myCookie, setMyCookie] = useCookie("my-cookie", { givenName: "John", surname: "Smith", age: 20 })
	return (
		<div class="w-full p-4">
			<p>Name: {myCookie.givenName} {myCookie.surname}</p>
			<p>Age:  {myCookie.age}</p>
			<Button label="Age 1 Year" onSubmit={() => setMyCookie({ ...myCookie, age: myCookie + 1})} />
		</div>
	)
}
```