// @flow

import m from "mithril"
import {TextFieldN} from "../gui/base/TextFieldN"
import stream from "mithril/stream/stream.js"
import {DropDownSelectorN} from "../gui/base/DropDownSelectorN"
import {lang} from "../misc/LanguageViewModel"
import {px, size} from "../gui/size"
import {ButtonN, ButtonType} from "../gui/base/ButtonN"
import {themeManager} from "../gui/theme"
import {debounce} from "../api/common/utils/Utils"
import {MailRow} from "../mail/view/MailRow"
import {createMail} from "../api/entities/tutanota/Mail"
import {createMailAddress} from "../api/entities/tutanota/MailAddress"
import {deviceConfig} from "../misc/DeviceConfig"

export type SimpleCustomColorEditorAttrs = {
	accentColor: Stream<string>,
	selectedTheme: Stream<string>,
	updateCustomTheme: () => void
}

export const COLOR_PICKER_WIDTH = 400
export const COMPONENT_PREVIEW_HEIGHT = 300
export const BUTTON_WIDTH = 270

export class SimpleCustomColorEditor implements MComponent<SimpleCustomColorEditorAttrs> {
	_colorPickerDom: ?HTMLInputElement;
	_debounceUpdateCustomTheme: (SimpleCustomColorEditorAttrs) => void;
	_mailRow: MailRow
	_mailRow2: MailRow

	constructor(vnode: Vnode<SimpleCustomColorEditorAttrs>) {
		this._debounceUpdateCustomTheme = debounce(200, (attrs) => {
			attrs.updateCustomTheme()
		})
		this._mailRow = new MailRow(false)
		this._mailRow2 = new MailRow(false)
	}

	view(vnode: Vnode<SimpleCustomColorEditorAttrs>): Children {
		return m("", [
			m(".flex", [
				m(".mr-s.flex-grow",
					m(TextFieldN, {
						label: () => "Accent color",
						value: themeManager.customTheme ? stream(themeManager.customTheme.content_accent) : vnode.attrs.accentColor,
						injectionsRight: () => m("input.color-picker.mb-xs.mr-s", {
							oncreate: ({dom}) => this._colorPickerDom = dom,
							type: "color",
							value: themeManager.customTheme ? themeManager.customTheme.content_accent : vnode.attrs.accentColor(),
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
						selectedValue: vnode.attrs.selectedTheme
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
							width: px(BUTTON_WIDTH)
						}
					},
					m(ButtonN, {
						label: 'login_action',
						click: () => console.log("clicked"),
						type: ButtonType.Login
					})),
				m(".pt-m", [
					m(ButtonN, {
						style: {width: px(BUTTON_WIDTH)},
						label: () => "Secondary",
						click: () => console.log("clicked"),
						type: ButtonType.Secondary
					}),
					m(ButtonN, {
						style: {width: px(BUTTON_WIDTH)},
						label: () => "Primary",
						click: () => console.log("clicked"),
						type: ButtonType.Primary
					})
				]),
				m(".pt-m", this.renderMailRow()),
			])
		])
	}

	renderMailRow(): Children {
		const mail = createMail({
			sender: createMailAddress({
				address: "Preview",
				name: "Preview"
			}),
			receivedDate: new Date(),
			subject: "Mail 1",
			unread: false,
			replyType: '0',
			confidential: true,
			attachments: [],
			state: '2'
		})
		const mail2 = createMail({
			sender: createMailAddress({
				address: "Preview",
				name: "Preview"
			}),
			receivedDate: new Date(),
			subject: "Mail 2",
			unread: true,
			replyType: '1',
			confidential: false,
			attachments: [],
			state: '2'
		})

		return m(".rel", {
			style: {
				width: px(size.second_col_max_width)
			}
		}, [
			m("li.list-row.pl.pr-l.odd-row.pt-m.pb-m", {
				oncreate: vnode => {
					this._mailRow.domElement = vnode.dom
					requestAnimationFrame(() => this._mailRow.update(mail, false))
				}
			}, this._mailRow.render()),
			m("li.list-row.pl.pr-l.pt-m.pb-m", {
				oncreate: vnode => {
					this._mailRow2.domElement = vnode.dom
					requestAnimationFrame(() => this._mailRow2.update(mail2, true))
				},
				style: {
					top: px(size.list_row_height)
				}
			}, this._mailRow2.render())
		])
	}
}
