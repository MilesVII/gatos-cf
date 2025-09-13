
type Rampike<Root, Params> = Root & {
	rampike: {
		params: Params,
		render: () => void
	}
}

export function rampike<Root, Params>(
	template: HTMLTemplateElement,
	params: Params,
	render: (params: Params, root: Root) => void
) {
	const contents = template.content.cloneNode(true);
	const roots: unknown[] = [];
	contents.childNodes.forEach(node => {
		if (node.nodeType === Node.ELEMENT_NODE)
			roots.push(node as unknown);
	});
	if (roots.length < 1) throw new Error("provided template has no elements");

	const root = roots[0] as Rampike<Root, Params>;

	root.rampike = {
		params: { ...params },
		render: () => render(root.rampike.params, root)
	};
	root.rampike.render();

	return root;
}
