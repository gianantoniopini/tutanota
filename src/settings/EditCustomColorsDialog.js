// @flow
import m from "mithril"
import {lang} from "../misc/LanguageViewModel"
import {assertMainOrNode} from "../api/common/Env"
import {Dialog} from "../gui/base/Dialog"
import {ButtonType} from "../gui/base/ButtonN"
import type {Theme} from "../gui/theme"
import {themeManager} from "../gui/theme"
import type {DialogHeaderBarAttrs} from "../gui/base/DialogHeaderBar"
import {Keys} from "../api/common/TutanotaConstants"
import type {TextFieldAttrs} from "../gui/base/TextFieldN"
import {TextFieldN} from "../gui/base/TextFieldN"
import stream from "mithril/stream/stream.js"
import {downcast} from "../api/common/utils/Utils"
import type {SegmentControlItem} from "../gui/base/SegmentControl"
import {SegmentControl} from "../gui/base/SegmentControl"
import {SimpleCustomColorEditor} from "./SimpleCustomColorEditor"
import {deviceConfig} from "../misc/DeviceConfig"
import {getLogoSvg} from "../gui/base/icons/Logo"

assertMainOrNode()

let COLOR_FORMAT = new RegExp("^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$")

export const SettingsState = Object.freeze({
	Simple: 'Simple',
	Advanced: 'Advanced'
})

export function show(themeToEdit: Theme, onThemeChanged: (Theme) => mixed) {
	const colorFieldsAttrs = Object.keys(themeManager.getDefaultTheme())
	                               .filter(name => name !== "logo" && name !== "themeId" && name !== "appearance")
	                               .sort((a, b) => a.localeCompare(b))
	                               .map(colorName => {
			                               // value is closed over by injectionsRight,
			                               // so the color switch will always be up to date with the contents of the text field
			                               const value = stream(themeToEdit[colorName] || "")
			                               return {
				                               label: () => colorName,
				                               value: value,
				                               injectionsRight: () => [
					                               m("", {
						                               style: {
							                               width: "106px", // 100 + 6px negative margin
							                               height: "20px",
							                               "margin-bottom": "2px",
							                               "background-color": getValidColorValue(value()) || "transparent"
						                               }
					                               })
				                               ]
			                               }
		                               }
	                               )

	const nbrOfLeftColors = Math.ceil(colorFieldsAttrs.length / 2.0)
	const leftColumnsAttrs = colorFieldsAttrs.slice(0, nbrOfLeftColors)
	const rightColumnsAttrs = colorFieldsAttrs.slice(nbrOfLeftColors)
	const settingsViewType = stream(SettingsState.Simple)
	let newTheme = themeToEdit.logo ? {"logo": themeToEdit.logo} : {}


	let accentColor = stream(themeManager._getTheme(deviceConfig.getTheme()).content_accent)
	let selectedTheme = stream(themeManager._getTheme(deviceConfig.getTheme()).appearance)

	const SettingsItems: SegmentControlItem<string>[] = [
		{name: lang.get("simpleSettings_label"), value: SettingsState.Simple},
		{name: lang.get("advancedSettings_label"), value: SettingsState.Advanced}
	]

	const form = {
		view: () => {
			return m(".pb", [
				m(SegmentControl, {
					selectedValue: settingsViewType,
					items: SettingsItems
				}),
				settingsViewType() === SettingsState.Simple
					? m(SimpleCustomColorEditor, {
						accentColor: accentColor,
						selectedTheme: selectedTheme,
						updateCustomTheme: applyCustomTheme,
					})
					: [
						m(".small.mt", lang.get('customColorsInfo_msg')),
						m(".wrapping-row", [
							m("", leftColumnsAttrs.map(c => {
								return m("", [
									m(TextFieldN, c),
									_getDefaultColorLine(c)
								])
							})),
							m("", rightColumnsAttrs.map(c => {
								return m("", [
									m(TextFieldN, c),
									_getDefaultColorLine(c)
								])
							}))
						])
					],
			])
		}
	}

	const applyCustomTheme = () => {
		newTheme = applyColors(accentColor(), selectedTheme())
		onThemeChanged(downcast(newTheme))
	}

	const cancelAction = () => {
		onThemeChanged(downcast(themeToEdit))
		themeManager.setThemeId("light")
		dialog.close()
	}

	const okAction = () => {
		if (settingsViewType() === SettingsState.Simple) {
			// applyCustomTheme()
			newTheme = applyColors(accentColor(), selectedTheme())
		} else {
			for (let i = 0; i < colorFieldsAttrs.length; i++) {
				let colorValue = colorFieldsAttrs[i].value().trim()
				if (colorValue) {
					if (COLOR_FORMAT.test(colorValue)) {
						newTheme[(colorFieldsAttrs[i]: any).label()] = colorValue
					} else {
						Dialog.error("correctValues_msg")
						return
					}
				}
			}
		}
		onThemeChanged(downcast(newTheme))
		dialog.close()
	}

	let actionBarAttrs: DialogHeaderBarAttrs = {
		left: [{label: "cancel_action", click: cancelAction, type: ButtonType.Secondary}],
		right: [{label: "ok_action", click: okAction, type: ButtonType.Primary}],
		middle: () => lang.get("customColors_label")
	}

	let dialog = Dialog.largeDialog(actionBarAttrs, form)
	                   .addShortcut({
		                   key: Keys.ESC,
		                   exec: cancelAction,
		                   help: "close_alt"
	                   }).setCloseHandler(cancelAction)
	                   .show()
}

function getValidColorValue(colorValue: string): ?string {
	const trimmedColorValue = colorValue.trim()
	if (trimmedColorValue && COLOR_FORMAT.test(trimmedColorValue)) {
		return trimmedColorValue
	} else {
		return null
	}
}

function _getDefaultColorLine(field: TextFieldAttrs): Child {
	let colorValue = getValidColorValue(field.value())
	if (!field.value().trim() || colorValue) {
		let colorName = (field: any).label()
		return m(".small.flex-space-between", [
			m("", lang.get("defaultColor_label", {"{1}": themeManager.getDefaultTheme()[colorName]})),
			m("", {
				style: {
					width: '100px',
					height: '10px',
					"margin-top": "2px",
					"background-color": themeManager.getDefaultTheme()[colorName]
				}
			})
		])
	} else {
		return m(".small", lang.get("invalidInputFormat_msg"))
	}
}

function applyColors(accentColor: string, theme: string): Object {
	const light_lighter_1 = '#DDDDDD'
	const light_lighter_0 = '#aeaeae'
	const light_grey = '#999999'

	const dark_lighter_2 = '#4e4e4e'
	const dark_lighter_1 = "#363636"
	const dark_lighter_0 = '#232323'
	const dark = '#222222'
	const dark_darker_0 = '#111111'
	const logo_text_bright_grey = '#c5c7c7'

	const light_white = '#ffffff'

	const grey_lighter_4 = '#f6f6f6'
	const grey_lighter_3 = '#eaeaea'
	const grey_lighter_2 = "#e1e1e1"
	const grey_lighter_1 = '#d5d5d5'
	const grey_lighter_0 = '#b8b8b8'
	const grey = '#868686'
	const grey_darker_0 = '#707070'
	const grey_darker_1 = '#303030'
	const logo_text_dark_grey = '#4a4a4a'

	if (theme === 'Light') {
		return {
			list_accent_fg: accentColor,
			content_accent: accentColor,
			content_button_selected: accentColor,
			navigation_button_selected: accentColor,
			header_button_selected: accentColor,
			logo: getLogoSvg(accentColor, logo_text_dark_grey),
			appearance: 'Light',

			button_bubble_bg: grey_lighter_3,
			button_bubble_fg: grey_darker_1,

			content_fg: grey_darker_1,
			content_button: grey_darker_0,
			content_button_icon: light_white,
			content_button_icon_selected: light_white,
			content_bg: light_white,
			content_border: grey_lighter_1,
			content_message_bg: grey_lighter_0,

			header_bg: light_white,
			header_box_shadow_bg: grey_lighter_1,
			header_button: grey_darker_0,

			list_bg: light_white,
			list_alternate_bg: grey_lighter_4,
			list_message_bg: grey_lighter_0,
			list_border: grey_lighter_2,

			modal_bg: grey_darker_1,
			elevated_bg: light_white,

			navigation_bg: grey_lighter_4,
			navigation_border: grey_lighter_2,
			navigation_button: grey_darker_0,
			navigation_button_icon: light_white,
			navigation_button_icon_selected: light_white,
			navigation_menu_bg: grey_lighter_3,
			navigation_menu_icon: grey
		}
	} else {
		return {
			list_accent_fg: accentColor,
			content_accent: accentColor,
			content_button_selected: accentColor,
			navigation_button_selected: accentColor,
			header_button_selected: accentColor,
			logo: getLogoSvg(accentColor, logo_text_bright_grey),
			appearance: 'Dark',

			button_bubble_bg: dark_lighter_2,
			button_bubble_fg: light_lighter_1,

			content_fg: light_lighter_1,
			content_button: light_lighter_0,
			content_button_icon_bg: dark_lighter_2,
			content_button_icon: light_lighter_1,
			content_button_icon_selected: dark_lighter_0,
			content_bg: dark_darker_0,
			content_border: dark_lighter_1,
			content_message_bg: dark_lighter_2,


			header_bg: dark,
			header_box_shadow_bg: dark_darker_0,
			header_button: light_lighter_0,

			list_bg: dark_darker_0,
			list_alternate_bg: dark_lighter_0,
			list_message_bg: dark_lighter_2,
			list_border: dark_lighter_1,

			modal_bg: dark_darker_0,
			elevated_bg: dark_lighter_0,

			navigation_bg: dark_lighter_0,
			navigation_border: dark_lighter_1,
			navigation_button: light_lighter_0,
			navigation_button_icon_bg: dark_lighter_2,
			navigation_button_icon: light_lighter_1,
			navigation_button_icon_selected: light_lighter_0,
			navigation_menu_bg: dark_darker_0,
			navigation_menu_icon: light_grey,
		}
	}
}
