import { Kysely } from "kysely";
import { D1Dialect } from "kysely-d1";
import { Database, migrations } from "./db";
import { routes } from "./api";

const MIGRATIONS_EXPOSED = false;

const respond = (status: number, body: BodyInit | null = null) => {
	return new Response(body, { status })
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		if (request.method !== "POST") return respond(403);

		const db = new Kysely<Database>({ dialect: new D1Dialect({ database: env.gatos }) });
		const migrationRequest = request.headers.get("x-admin-migrate");
		if (migrationRequest) {
			if (!MIGRATIONS_EXPOSED) return respond(403);
			const migration = migrations[migrationRequest];
			// console.log(migration, Object.keys(migrations), migrationRequest)
			if (!migration) return respond(404);

			await migration(db);
			return respond(200);
		}

		return respond(200);
		// const token = request.headers.get("authorization") ?? undefined;
		// const url = new URL(request.url);
		// console.log(url.pathname);
		// const route = routes[url.pathname];
		// if (!route) return respond(404);

		// return respond(200, route())
		// const r = await db.selectFrom("users").selectAll().execute();

		// return respond(200, JSON.stringify(r));
	}
} satisfies ExportedHandler<Env>;
