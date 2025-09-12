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
	const template = document.querySelector<HTMLTemplateElement>("template#post");
	const ram = rampike(template, {}, () => {});

	const tabs = document.querySelector<RampikeTabs>("rampike-tabs");
	document.querySelectorAll<HTMLElement>("[data-tab]").forEach(e => {
		e.addEventListener("click", () => tabs.tab = e.dataset.tab)
	});

	await fetch("/api/tags", { method: "POST", body: JSON.stringify({}) })
}
