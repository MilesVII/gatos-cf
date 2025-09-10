import { type Kysely } from "kysely";
import { type Database } from "./db";
import { password, Result } from "./utils";

type State = {
	db: Kysely<Database>,
	token?: string
};

type ProtectedResult<T> = {
	clearance: Awaited<ReturnType<typeof auth>>,
	result: T | null
};

type Route<T extends any[], R> = (state: State, ...rest: T) => Promise<R>;
function guarded<T extends any[], R>(
	protectedRoute: boolean,
	core: Route<T, R>
): (state: State, ...rest: T) => Promise<ProtectedResult<R>> {
	return async (state: State, ...rest: T) => {
		if (protectedRoute) {
			const clearance = await auth(state);
			if (clearance !== "ok") return { clearance, result: null }
		}
		return { clearance: "ok", result: await core(state, ...rest)}
	}
};

export const routes = {
	"/user/register": guarded( true, register),
	"/user/signin":   guarded(false, signin),
	"/user/signoff":  guarded( true, signoff),
	"/user/change":   guarded( true, changePassword)
};

async function auth({ db, token }: State): Promise<"expired" | "nope" | "ok"> {
	const entry = await db.selectFrom("tokens").select(["value", "expiry"]).executeTakeFirst();
	if (!entry) return "nope";
	if (entry.expiry !== "none") return "expired";
	return "ok";
}

async function register(state: State, login: string, pwd: string): Promise<boolean> {
	const { db, token } = state;
	await db
		.insertInto("users")
		.values({ login, password: await password(pwd) })
		.execute();
	return true;
}

async function signin({ db }: State, login: string, pwd: string, info: string): Promise<Result<string, "nouser" | "password">> {
	const user = await db
		.selectFrom("users")
		.selectAll()
		.where("login", "=", login)
		.executeTakeFirst();
	if (!user) return { success: false, error: "nouser" };
	if (user.password !== await password(pwd)) return { success: false, error: "password" };

	const token = crypto.randomUUID();
	await db
		.insertInto("tokens")
		.values({ user: user.id, value: token, info, expiry: "none" })
		.execute();

	return { success: true, value: token };
}

async function signoff({ db, token }: State): Promise<boolean> {
	if (!token) return false;
	await db.deleteFrom("tokens").where("value", "=", token).execute();
	return true;
}

async function changePassword({ db, token }: State, newPassword: string): Promise<boolean> {
	if (!token) return false;
	const user = await db
		.selectFrom("tokens")
		.select(["user", "value"])
		.where("value", "=", token)
		.executeTakeFirst();
	if (!user) return false;
	
	await db
		.updateTable("users")
		.where("id", "=", user.user)
		.set("password", await password(newPassword))
		.execute();
	return true;
}
