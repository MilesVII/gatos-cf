import { changePassword, Sessions, signin, signout, vibecheck } from "./api";
import { RampikeTabs } from "./components/tabs";
import { State } from "./types";

export function attachDash(state: State) {
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
