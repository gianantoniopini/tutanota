// @flow

import m from "mithril"

export type ListColumnAttrs = {
	headerContent: Children,
	padHorizontal?: ?boolean
}

export class ListColumnWrapper implements MComponent<ListColumnAttrs> {
	view(vnode: Vnode<ListColumnAttrs>): Children {
		return m(".flex.flex-column.fill-absolute", [
			m(".flex.flex-column.justify-center.list-border-right.list-bg.list-header"
				+ (vnode.attrs.padHorizontal !== false ? ".plr-l" : ""), vnode.attrs.headerContent),
			m(".rel.flex-grow", vnode.children)
		])
	}
}

