
export type Rampike<Root, Params> = Root & {
	rampike: {
		params: Params,
		render: () => void
	}
}

export function rampike<Root, Params>(
	root: Root,
	params: Params,
	render: (params: Params, root: Root) => void
) {
	const _root = root as Rampike<Root, Params>;
	_root.rampike = {
		params,
		render: () => render(_root.rampike.params, _root)
	};
	_root.rampike.render();

	return root;
}

export function fromTemplate<T extends Element>(template: HTMLTemplateElement) {
	const contents = template.content.cloneNode(true);
	const roots: unknown[] = [];
	contents.childNodes.forEach(node => {
		if (node.nodeType === Node.ELEMENT_NODE)
			roots.push(node as unknown);
	});
	if (roots.length < 1) throw new Error("provided template has no elements");

	return roots[0] as T;
}
