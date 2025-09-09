import { Generated, Kysely } from "kysely";
import { password } from "./utils";

type Post = {
	id: string,
	tags: string,
	source: string,
	caption: string,
	media: string
}
type User = {
	id: Generated<number>,
	login: string,
	password: string,
}
type Token = {
	user: number,
	value: string,
	info: string,
	expiry: string
}

export type Database = {
	posts: Post,
	users: User,
	tokens: Token
}

export const migrations: Record<string, (db: Kysely<Database>) => Promise<void>> = {
	create: async (db: Kysely<Database>) => {
		await db.schema.dropTable("posts").ifExists().execute();
		await db.schema.dropTable("users").ifExists().execute();
		await db.schema.dropTable("tokens").ifExists().execute();

		await db.schema
			.createTable("posts")
			.addColumn("id", "text", c => c.primaryKey())
			.addColumn("tags", "text")
			.addColumn("source", "text")
			.addColumn("caption", "text")
			.addColumn("media", "text")
			.execute();

		await db.schema
			.createTable("users")
			.addColumn("id", "integer", c => c.primaryKey().autoIncrement())
			.addColumn("login", "text")
			.addColumn("password", "text")
			.execute();
		
		await db.schema
			.createTable("tokens")
			.addColumn("user", "integer")
			.addForeignKeyConstraint(
				"user-foreign",
				["user"], "users", ["id"]
			)
			.addColumn("value", "text")
			.addColumn("info", "text")
			.execute();

		const p = await password("");
		await db
			.insertInto("users")
			.values({ login: "admin", password: p })
			.execute();
	}
}
