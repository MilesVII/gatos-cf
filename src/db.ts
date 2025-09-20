import { Generated, Kysely } from "kysely";
import { chunk, password } from "./utils";

export type Post = {
	time: number,
	id: string,
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
	id: Generated<number>,
	user: number,
	value: string,
	info: string,
	expiry: string
}
type Tag = {
	id: Generated<number>,
	name: string
}
type TagPair = {
	tag: number,
	post: string
}

export type Database = {
	posts: Post,
	tags: Tag,
	pairs: TagPair,
	users: User,
	tokens: Token
}

export const migrations: Record<string, (db: Kysely<Database>) => Promise<void>> = {
	create: async db => {
		await db.schema.dropTable("pairs").ifExists().execute();
		await db.schema.dropTable("tokens").ifExists().execute();
		await db.schema.dropTable("posts").ifExists().execute();
		await db.schema.dropTable("tags").ifExists().execute();
		await db.schema.dropTable("users").ifExists().execute();

		await db.schema
			.createTable("posts")
			.addColumn("id", "text", c => c.primaryKey())
			.addColumn("time", "integer")
			.addColumn("source", "text")
			.addColumn("caption", "text")
			.addColumn("media", "text")
			.execute();

		await db.schema
			.createTable("tags")
			.addColumn("id", "integer", c => c.primaryKey().autoIncrement())
			.addColumn("name", "text")
			.addUniqueConstraint("tag-name-unique", ["name"])
			.execute();

		await db.schema
			.createTable("pairs")
			.addColumn("tag", "integer")
			.addForeignKeyConstraint("tag-foreign", ["tag"], "tags", ["id"])
			.addColumn("post", "text")
			.addForeignKeyConstraint("post-foreign", ["post"], "posts", ["id"])
			.execute();
		
		await db.schema
			.createTable("users")
			.addColumn("id", "integer", c => c.primaryKey().autoIncrement())
			.addColumn("login", "text")
			.addColumn("password", "text")
			.execute();
		
		await db.schema
			.createTable("tokens")
			.addColumn("id", "integer", c => c.primaryKey().autoIncrement())
			.addColumn("user", "integer")
			.addForeignKeyConstraint(
				"user-foreign",
				["user"], "users", ["id"]
			)
			.addColumn("value", "text")
			.addColumn("info", "text")
			.addColumn("expiry", "text")
			.execute();

		const p = await password("");
		await db
			.insertInto("users")
			.values({ login: "admin", password: p })
			.execute();
	}
}
