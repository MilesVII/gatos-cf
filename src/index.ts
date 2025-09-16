import { Kysely } from "kysely";
import { D1Dialect } from "kysely-d1";
import { Database, migrations } from "./db";
import { routes } from "./api";
import { nothrow } from "./utils";

const MIGRATIONS_EXPOSED = false;

const respond = (status: number, body: BodyInit | null = null, headers: HeadersInit = {}) => {
	return new Response(body, { status, headers })
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		if (request.method !== "POST") return respond(405);

		const db = new Kysely<Database>({ dialect: new D1Dialect({ database: env.gatos }) });
		const migrationRequest = request.headers.get("x-admin-migrate");
		if (migrationRequest) {
			if (!MIGRATIONS_EXPOSED) return respond(403);
			const migration = migrations[migrationRequest];
			if (!migration) return respond(404);

			await migration(db);
			return respond(200);
		}

		const url = new URL(request.url);
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
			case("/proxy"): {
				if (typeof params?.url !== "string") return respond(400);

				const result = await routes[route](state, params.url);
				return respond(200, result.result);
			}
		}
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
