import { Kysely } from "kysely";
import { D1Dialect } from "kysely-d1";
import { Database } from "./db";
import { routes } from "./api";
import { nothrow } from "./utils";

const respond = (status: number, body: BodyInit | null = null, headers: HeadersInit = {}) => {
	return new Response(body, { status, headers })
}

export default {
	async fetch(request, env, _ctx): Promise<Response> {
		const url = new URL(request.url);
		if (url.pathname.startsWith("/r2/")) {
			
			const [, key] = url.pathname.split("/r2/");
			return respond(200, await media(env.gatoStore, key));
		}
		if (url.pathname.startsWith("/feed/r2/")) {
			const feedToken = await env.gatosKV.get("feed-token");
			if (!feedToken) return respond(500, "feed token not defined");
			if (request.headers.get("x-feed-token") !== feedToken) return respond(401);
			const [, params] = url.pathname.split("/feed/r2/");
			const file = await request.bytes();
			await env.gatoStore.put(params, file);

			return respond(200);
		}
		if (request.method !== "POST") return respond(405);

		const db = new Kysely<Database>({ dialect: new D1Dialect({ database: env.gatos }) });

		const route = pickRoute(url.pathname);
		if (!route) return respond(501);

		const token = pickCookie(request.headers.get("cookie") ?? "", "auth_token") ?? undefined;
		const state = { db, token };
		const paramsResult = await nothrow<any>(async () => await request.json());
		const params = paramsResult.success ? paramsResult.value : null; 

		switch (route) {
			case("/api/user/vibecheck"): {
				const result = await routes[route](state);
				return respond(200, JSON.stringify(result));
			}
			case("/api/user/register"): {
				if (typeof params?.login !== "string")    return respond(400);
				if (typeof params?.password !== "string") return respond(400);

				await routes[route](state, params.login, params.password);
				return respond(200);
			}
			case("/api/user/signin"): {
				if (typeof params?.login !== "string")    return respond(400);
				if (typeof params?.password !== "string") return respond(400);
				if (typeof params?.info !== "string")     return respond(400);

				const result = await routes[route](state, params.login, params.password, params.info);
				if (result.clearance !== "ok") return respond(401, result.clearance);
				if (result.result?.success) {
					const token = result.result.value.token;
					delete result.result.value.token;
					return respond(
						200,
						JSON.stringify(result),
						{
							"set-cookie": `auth_token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/api/`
						}
					);
				} else
					return respond(401, result.result?.error)
			}
			case("/api/user/signoff"): {
				if (typeof params?.session !== "number") return respond(400);

				const result = await routes[route](state, params.session);
				if (result.clearance === "ok")
					return respond(
						200,
						null
					);
				else
					return respond(401, result.clearance);
			}
			case("/api/user/change"): {
				if (typeof params?.newPassword !== "string") return respond(400);

				const result = await routes[route](state, params.newPassword);
				if (result.clearance === "ok") return respond(200);
				else return respond(401, result.clearance);
			}
			case("/api/tags"): {
				const result = await routes[route](state);
				return respond(200, JSON.stringify(result));
			}
			case("/api/posts"): {
				if (typeof params?.page !== "number") return respond(400);
				// if (typeof params?.search !== "number") return respond(400);

				const result = await routes[route](state, params.page, params.search);
				return respond(200, JSON.stringify(result));
			}
			case("/api/post/attach"): {
				if (typeof params?.post !== "string") return respond(400);
				if (typeof params?.tag !== "string") return respond(400);

				const result = await routes[route](state, params.post, params.tag);
				return respond(200, JSON.stringify(result));
			}
			case("/api/post/untag"): {
				if (typeof params?.post !== "string") return respond(400);
				if (typeof params?.tag !== "number") return respond(400);

				const result = await routes[route](state, params.post, params.tag);
				return respond(200, JSON.stringify(result));
			}
			case("/feed/post"): {
				const feedToken = await env.gatosKV.get("feed-token");
				if (!feedToken) return respond(500, "feed token not defined");

				if (request.headers.get("x-feed-token") !== feedToken) return respond(401);
				if (typeof params?.caption !== "string")    return respond(400);
				if (typeof params?.id !== "number")         return respond(400);
				if (typeof params?.time !== "number")       return respond(400);
				if (typeof params?.mediaCount !== "number") return respond(400);

				await routes[route](state, params.caption, params.id, params.time, params.mediaCount);
				return respond(200);
			}
			case("/proxy"): {
				if (typeof params?.url !== "string") return respond(400);

				const result = await routes[route](state, params.url);
				return respond(200, result.result);
			}
		}
		// return respond(501);
	}
} satisfies ExportedHandler<Env>;

function pickRoute(pathname: string): (keyof typeof routes) | null {
	if (!Object.keys(routes).includes(pathname)) {
		return null;
	}
	return pathname as keyof typeof routes;
}

function pickCookie(raw: string, key: string): null | string {
	const v = raw
		.split("\n")
		.map(entry =>
			entry.trim().split("=")
		)
		.find(([k]) => k.trim() === key);
	return v ? v[1] : null;
}

async function media(r2: R2Bucket, key: string) {
	const item = await r2.get(key);
	if (item)
		return await item.bytes();
	else
		return null;
}
