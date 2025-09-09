// import bcrypt from "bcrypt"

export async function password(raw: string) {
	const text = new TextEncoder().encode(raw);

	const digest = await crypto.subtle.digest({ name: "SHA-512" }, text);

	return [...new Uint8Array(digest)]
		.map(b => b.toString(16).padStart(2, "0"))
		.join("");
}
