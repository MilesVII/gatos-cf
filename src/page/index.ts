import { changePassword, Post, posts, Sessions, signin, signout, Tag, tags, vibecheck } from "./api";
import { rampike, fromTemplate } from "./components/rampike";
import { define as defineTabs, RampikeTabs } from "./components/tabs";
import { define as definePages, RampikePagination } from "./components/pagination";

start();

async function start() {
	components();
	document.addEventListener("DOMContentLoaded", main);
}

function components() {
	defineTabs();
	definePages();
}

type State = {
	tags: Tag[],
	page: {
		posts: Post[],
		pager: RampikePagination
	},
	search: null | Tag["id"],
	loading: boolean,
	auth: boolean
};
async function main() {
	const state: State = {
		tags: [],
		page: {
			posts: [],
			pager: document.querySelector<RampikePagination>("#rp-pages")
		},
		search: null,
		loading: false,
		auth: false
	};
	attachListeners(state);

	updateTags(state);
	loadPage(state);
}

function attachListeners(state: State) {
	const tabsMain = document.querySelector<RampikeTabs>("rampike-tabs#rp-tabs-main");
	const tabsSide = document.querySelector<RampikeTabs>("rampike-tabs#rp-tabs-side");
	document.querySelectorAll<HTMLElement>("[data-tab]").forEach(e => {
		const target = e.dataset.for === "rp-tabs-main" ? tabsMain : tabsSide;
		e.addEventListener("click", () => target.tab = e.dataset.tab);
	});
	attachAuth(state);

	const searchBar = document.querySelector<HTMLInputElement>("input#search-bar");
	const searchButton = document.querySelector<HTMLElement>("#search-button");
	searchButton.addEventListener("click", () => {
		const term = searchBar.value.trim().toLowerCase();
		pickTag(state, term);
	});
	document.querySelector<HTMLElement>("#search-reset")?.addEventListener("click", () => {
		searchBar.value = "";
		state.page.pager.page = 0;
		state.search = null;
		loadPage(state);
	});

	state.page.pager.addEventListener("pick", (e: CustomEvent) => {
		state.page.pager.page = e.detail.page;
		loadPage(state);
	});
}

async function updateTags(state: State) {
	const t = await tags();
	if (!t) return;

	state.tags = t;

	let list = document.querySelector("datalist#list-tags");
	if (list) list.innerHTML = "";
	else {
		list = document.createElement("datalist");
		list.id = "list-tags";
		document.body.append(list);
	}

	list.append(...t.map(tag => {
		const item = document.createElement("option");
		item.value = tag.name;
		item.dataset.id = `${tag.id}`;
		item.dataset.count = `${tag.count}`;
		return item;
	}));

	const buttonList = document.querySelector(".tags-list");
	const searchBar = document.querySelector<HTMLInputElement>("#search-bar");
	if (!buttonList || !searchBar) return;
	buttonList.innerHTML = "";
	buttonList.append(...t.map(tag => {
		const item = document.createElement("button");
		item.textContent = `${tag.name} (${tag.count})`;
		item.addEventListener("click", () => {
			searchBar.value = tag.name;
			pickTag(state, tag.name);
		});
		return item;
	}));
}

async function loadPage(state: State) {
	state.loading = true;
	document.querySelector<HTMLElement>("#search-reset").hidden = state.search === null;
	const result = await posts(state.page.pager.page, state.search ?? undefined);
	state.page.pager.pageCount = Math.ceil(result.count / result.perPage);
	state.page.posts = result.posts;
	const container = document.querySelector<HTMLElement>(".post-list")!;
	container.innerHTML = "";
	container.append(...Array.from(result.posts).map(p => makePost(state, p)));
	state.loading = false;
}

function makePost(state: State, post: Post) {
	const postTemplate = document.querySelector<HTMLTemplateElement>("template#t-post")!;

	return rampike<HTMLDivElement, Post>(fromTemplate(postTemplate), post, (params, root) => {
		const [image, caption, _hr, tags, source] = Array.from(root.children) as HTMLElement[];

		image.hidden = params.media.length === 0;
		image.style.setProperty("--media-count", `${params.media.length}`);
		image.append(...params.media.map(url => {
			const e = document.createElement("img");
			e.src = url;
			return e;
		}));

		caption.hidden = !params.caption;
		caption.textContent = params.caption;

		tags.innerHTML = "";
		tags.hidden = params.tags.length === 0;

		tags.append(...params.tags.map(({ name }) => {
			const e = document.createElement("button");
			e.textContent = name;
			e.addEventListener("click", () => pickTag(state, name));
			return e;
		}));

		(source as HTMLAnchorElement).href = post.source;
		(source as HTMLAnchorElement).textContent = post.source;
	});
}

function pickTag(state: State, tagName: string) {
	const tag = state.tags.find(({ name }) => tagName === name);
	if (!tag) alert("постов с таким тегом не найдено");

	state.search = tag.id;
	state.page.pager.page = 0;
	document.body.scrollIntoView({behavior: "smooth"});
	document.querySelector<HTMLButtonElement>(`[data-for="rp-tabs-main"][data-tab="posts"]`)?.click();
	loadPage(state);
}

function attachAuth(state: State) {
	const dashTabs =        document.querySelector<RampikeTabs>("#rp-tabs-dash")
	const vibecheckButton = document.querySelector<HTMLButtonElement>("#dash-check");
	const loginField =      document.querySelector<HTMLInputElement>("#dash-login");
	const passwordField =   document.querySelector<HTMLInputElement>("#dash-pass");
	const signinButton =    document.querySelector<HTMLButtonElement>("#dash-signin");
	const sessionList =     document.querySelector<HTMLDivElement>(".dash-session-list");
	const changeField =     document.querySelector<HTMLInputElement>("#dash-change-field");
	const changeButton =    document.querySelector<HTMLButtonElement>("#dash-change-button");

	function fillSessionList(sessions: Sessions) {
		sessionList.innerHTML = "";
		sessionList.append(...sessions.map(({id, info}) => {
			const button = document.createElement("button");
			button.classList.add("wide");
			button.addEventListener("click", () => {
				signout(id);
				button.remove();
			});
			button.textContent = info;
			return button;
		}));
	}
	vibecheckButton.addEventListener("click", async () => {
		const vibe = await vibecheck();
		if (vibe) {
			fillSessionList(vibe);
			dashTabs.tab = "admin";
		} else {
			dashTabs.tab = "signin";
		}
	});
	signinButton.addEventListener("click", async () => {
		const result = await signin(loginField.value, passwordField.value);
		if (!result) return;
		
		fillSessionList(result);
		dashTabs.tab = "admin";
	});
	
	changeButton.addEventListener("click", () => {
		changePassword(changeField.value).then(() => dashTabs.tab = "signin");
	});
}
