// @flow

import m from "mithril"
import {TextFieldN} from "../gui/base/TextFieldN"
import stream from "mithril/stream/stream.js"
import {DropDownSelectorN} from "../gui/base/DropDownSelectorN"
import {lang} from "../misc/LanguageViewModel"
import {px} from "../gui/size"
import {ButtonN, ButtonType} from "../gui/base/ButtonN"
import {theme} from "../gui/theme"
import {debounce} from "../api/common/utils/Utils"

export type SimpleCustomColorEditorAttrs = {
	accentColor: Stream<string>,
	updateCustomTheme: () => void
}

export const COLOR_PICKER_WIDTH = 400
export const COMPONENT_PREVIEW_HEIGHT = 300
export const LOGIN_BUTTON_WIDTH = 270

export class SimpleCustomColorEditor implements MComponent<SimpleCustomColorEditorAttrs> {
	_colorPickerDom: ?HTMLInputElement
	_selectedTheme: Stream<string>
	_debounceUpdateCustomTheme: (SimpleCustomColorEditorAttrs) => void

	constructor(vnode: Vnode<SimpleCustomColorEditorAttrs>) {
		this._selectedTheme = stream('Light')
		this._debounceUpdateCustomTheme = debounce(200, (attrs) => {
			attrs.updateCustomTheme()
		})
	}

	view(vnode: Vnode<SimpleCustomColorEditorAttrs>): Children {
		return m("", [
			m(".flex", [
				m(".mr-s.flex-grow",
					m(TextFieldN, {
						label: () => "Accent color",
						value: vnode.attrs.accentColor,
						injectionsRight: () => m("input.color-picker.mb-xs.mr-s", {
							oncreate: ({dom}) => this._colorPickerDom = dom,
							type: "color",
							value: vnode.attrs.accentColor(),
							oninput: (inputEvent) => {
								vnode.attrs.accentColor(inputEvent.target.value)
								this._debounceUpdateCustomTheme(vnode.attrs)
							}
						}),
						maxWidth: COLOR_PICKER_WIDTH,
						disabled: true
					})),
				m(".ml-s.flex-grow",
					m(DropDownSelectorN, {
						label: () => "Choose theme",
						items: [
							{name: lang.get("light_label"), value: 'Light'},
							{name: lang.get("dark_label"), value: 'Dark'}
						],
						selectedValue: this._selectedTheme
					}))
			]),
			m(".editor-border.mt-l.flex.col", { // component preview for color
				style: {
					height: px(COMPONENT_PREVIEW_HEIGHT),
					alignItems: 'center'
				}
			}, [
				m(".pt-m", {
						style: {
							width: px(LOGIN_BUTTON_WIDTH)
						}
					},
					m(ButtonN, {
						label: 'login_action',
						click: () => console.log("clicked"),
						type: ButtonType.Login
					})),
				m(".logo.logo-height.pl.pt-m", m.trust(theme.logo))
			])
		])
	}
}
