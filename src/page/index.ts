import { Post, posts, tags, vibecheck } from "./api";
import { rampike } from "./components/rampike";
import { define as defineTabs, RampikeTabs } from "./components/tabs";

start();

async function start() {
	components();
	document.addEventListener("DOMContentLoaded", main);
}

function components() {
	defineTabs();
}

async function main() {
	attachListeners();

	updateTags();
	vibecheck();
	const p = await posts();
	p.forEach(makePost);
}

function attachListeners() {
	const tabs = document.querySelector<RampikeTabs>("rampike-tabs");
	document.querySelectorAll<HTMLElement>("[data-tab]").forEach(e => {
		e.addEventListener("click", () => tabs.tab = e.dataset.tab)
	});

	const dashboardEntry = document.querySelector<HTMLButtonElement>("#dashboard-check");
	dashboardEntry?.addEventListener("click", () => {
		dashboardEntry.disabled = true;


	})
}

async function updateTags() {
	const t = await tags();
	if (!t) return;

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
	const searchBar = document.querySelector<HTMLInputElement>("#search");
	if (!buttonList || !searchBar) return;
	buttonList.innerHTML = "";
	buttonList.append(...t.map(tag => {
		const item = document.createElement("button");
		item.textContent = `${tag.name} (${tag.count})`;
		item.addEventListener("click", () => searchBar.value = tag.name);
		return item;
	}));
}

function makePost(post: Post) {
	const postTemplate = document.querySelector<HTMLTemplateElement>("template#t-post")!;

	const postElement = rampike<HTMLDivElement, Post>(postTemplate, post, (params, root) => {
		const [image, caption, _hr, tags] = Array.from(root.children) as HTMLElement[];

		image.hidden = params.media.length === 0;
		image.style.setProperty("--media-count", `${params.media.length}`);
		image.append(...params.media.map(url => {
			const e = document.createElement("img");
			e.src = url;
			return e;
		}));

		caption.textContent = params.caption;

		tags.innerHTML = "";
		tags.append(...params.tags.map(({ name }) => {
			const e = document.createElement("button");
			e.textContent = name;
			return e;
		}));
	});

	document.querySelector(".post-list").append(postElement);
}
