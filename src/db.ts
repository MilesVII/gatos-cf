import { Generated, Kysely } from "kysely";
import { chunk, password } from "./utils";
import dump from "./dump_6.json"

type Post = {
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
		await db.schema.dropTable("posts").ifExists().execute();
		await db.schema.dropTable("tags").ifExists().execute();
		await db.schema.dropTable("pairs").ifExists().execute();
		await db.schema.dropTable("users").ifExists().execute();
		await db.schema.dropTable("tokens").ifExists().execute();

		await db.schema
			.createTable("posts")
			.addColumn("id", "text", c => c.primaryKey())
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
	},
	fill: async db => {
		const pairs: [id: string, tag: string][] = [];
		const posts = dump.posts
			.sort((a, b) => a.postId - b.postId)
			.map<Post>(post => {
				const id = `vk${post.postId}`;
				pairs.push(...post.tags.map(t => ([id, t] as [string, string])));
				return {
					id,
					caption: post.text,
					media: post.photos.map(photo => photo.url).join("\n"),
					source: `https://vk.com/memy_pro_kotow?w=wall-95648824_${post.postId}`
				}
			});

		for (const chonk of chunk(posts, 20)) {
			await db.transaction().execute(async trx => {
				for (const post of chonk) {
					await trx
						.insertInto("posts")
						.values(post)
						.execute();
				}
			});
		}

		const tags = new Set<string>(pairs.map(([, tag]) => tag));
		await db.transaction().execute(async trx => {
			for (const tag of tags) {
				await trx
					.insertInto("tags")
					.values({ name: tag })
					.execute();
			}
		});

		const indexedTags = await db.selectFrom("tags").selectAll().execute();
		await db.transaction().execute(async trx => {
			for (const [post, tag] of pairs) {
				const tagId = indexedTags.find(({ name }) => name === tag)!.id;

				await trx
					.insertInto("pairs")
					.values({ post, tag: tagId })
					.execute();
			}
		});
	}
}
