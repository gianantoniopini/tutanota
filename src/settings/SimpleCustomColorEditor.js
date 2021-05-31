// @flow

import m from "mithril"
import {TextFieldN} from "../gui/base/TextFieldN"
import stream from "mithril/stream/stream.js"
import {DropDownSelectorN} from "../gui/base/DropDownSelectorN"
import {lang} from "../misc/LanguageViewModel"
import {px} from "../gui/size"
import {deviceConfig} from "../misc/DeviceConfig"
import {themeManager} from "../gui/theme"

export type SimpleCustomColorEditorAttrs = {}

export const COLOR_PICKER_WIDTH = 400
export const COMPONENT_PREVIEW_HEIGHT = 300

export class SimpleCustomColorEditor implements MComponent<SimpleCustomColorEditorAttrs> {
	_accentColor: Stream<string>
	_colorPickerDom: ?HTMLInputElement
	_selectedTheme: Stream<string>

	constructor(vnode: Vnode<SimpleCustomColorEditorAttrs>) {
		this._accentColor = stream(themeManager._getTheme(deviceConfig.getTheme()).content_accent)
		this._selectedTheme = stream('Light')
	}

	view(vnode: Vnode<SimpleCustomColorEditorAttrs>): Children {
		return m("", [
			m(".flex", [
				m(".mr-s.flex-grow",
					m(TextFieldN, {
						label: () => "Accent color",
						value: this._accentColor,
						injectionsRight: () => m("input.color-picker.mb-xs.mr-s", {
							oncreate: ({dom}) => this._colorPickerDom = dom,
							type: "color",
							value: this._accentColor(),
							oninput: (inputEvent) => {
								this._accentColor(inputEvent.target.value)
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
			m(".editor-border.mt-l", {
				style: {
					height: px(COMPONENT_PREVIEW_HEIGHT)
				}
			})
		])
	}

	getAccentColor(): string {
		return this._accentColor()
	}

	/*
	    we probably want to change

	    list_accent_fg
	    content_accent
	    content_button_selected
	    navigation_button_selected
	    header_button_selected
	 */

}
