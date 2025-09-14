import { nothrow, Result } from "./utils";

async function api(
	endpoint: string,
	payload: any = {}
): Promise<
	Result<any, any>
> {
	const response = await fetch(endpoint, { method: "POST", body: JSON.stringify(payload) });
	if (response.ok) {
		const result = await nothrow(() => response.json());
		if (!result.success) return result;

		if (result.value.clearance !== "ok")
			return {
				success: false as const,
				error: `unauthorized: ${result.value.clearance}`
			};
		return { success: true, value: result.value.result }
	} else {
		console.error(response);
		return { success: false as const, error: response };
	}
}

export type Tag = {
	id: number,
	name: string,
	count: number
}
export async function tags() {
	const result = await api("/api/tags");
	if (result.success)
		return result.value as Tag[];
	else
		return null;
}

export type Post = {
	caption: string,
	id: string,
	media: string[],
	source: string,
	tags: {
		id: number,
		name: string
	}[]
}
export async function posts(page: number, search?: number) {
	const result = await api("/api/posts", { page, search });
	if (result.success) {
		console.log(result.value)
		const posts: Post[] = result.value.posts.map((raw: any) => ({
			caption: raw.caption,
			id: raw.id,
			media: raw.media.split("\n"),
			source: raw.source,
			tags: JSON.parse(raw.tags)
				.map((t: any) => ({
					id: t.tagId,
					name: t.tagName
				}))
				.filter((t: any) => t.id !== null)
		}));
		return { count: result.value.count, posts, perPage: result.value.perPage };
	} else
		return null;
}

export async function vibecheck(): Promise<boolean> {
	const result = await api("/api/user/vibecheck");
	return result.success && result.value;
}
