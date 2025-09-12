
class RampikeUnit<Params> extends HTMLElement {
	// readonly
	params: Params;

	render() {

	}
	constructor() {
		super();
	}
};

export function rampike<Params>(
	template: HTMLTemplateElement,
	params: Params,
	render: (params: Params, root: Element) => void
) {
	const _params = { ...params };
	const contents = template.content.cloneNode(true);
	console.log(contents)
	// render(_params, contents);

	return { params: _params, contents }
}
