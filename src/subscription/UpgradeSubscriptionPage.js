// @flow
import m from "mithril"
import stream from "mithril/stream/stream.js"
import {lang} from "../misc/LanguageViewModel"
import type {SubscriptionParameters, UpgradeSubscriptionData} from "./UpgradeSubscriptionWizard"
import {SubscriptionSelector} from "./SubscriptionSelector"
import {isApp, isTutanotaDomain} from "../api/common/Env"
import {client} from "../misc/ClientDetector"
import type {ButtonAttrs} from "../gui/base/ButtonN"
import {ButtonN, ButtonType} from "../gui/base/ButtonN"
import type {SubscriptionActionButtons, SubscriptionTypeEnum} from "./SubscriptionUtils"
import {SubscriptionType, UpgradePriceType, UpgradeType} from "./SubscriptionUtils"
import {Dialog, DialogType} from "../gui/base/Dialog"
import type {WizardPageAttrs, WizardPageN} from "../gui/base/WizardDialogN"
import {emitWizardEvent, WizardEventType} from "../gui/base/WizardDialogN"
import {DefaultAnimationTime} from "../gui/animation/Animations"
import {Keys} from "../api/common/TutanotaConstants"
import {CheckboxN} from "../gui/base/CheckboxN"
import {getSubscriptionPrice} from "./PriceUtils"

export class UpgradeSubscriptionPage implements WizardPageN<UpgradeSubscriptionData> {

	oncreate(vnode: Vnode<WizardPageAttrs<UpgradeSubscriptionData>>): void {
		const subscriptionParameters = vnode.attrs.data.subscriptionParameters
		if (subscriptionParameters) {
			// We automatically route to the next page; when we want to go back from the second page, we do not want to keep calling nextPage
			vnode.attrs.data.subscriptionParameters = null
			vnode.attrs.data.options.paymentInterval = stream(Number(subscriptionParameters.interval))
			gatherInformationForNextPage(subscriptionParameters, vnode.attrs.data, () => this.showNextPage(vnode))
		}
	}

	view(vnode: Vnode<WizardPageAttrs<UpgradeSubscriptionData>>): Children {
		const data = vnode.attrs.data
		const subscriptionActionButtons: SubscriptionActionButtons = {
			Free: {
				view: () => {
					return m(ButtonN, {
						label: "pricing.select_action",
						click: () => {
							confirmFreeSubscription().then(confirmed => {
								if (confirmed) {
									data.type = SubscriptionType.Free
									data.price = "0"
									data.priceNextYear = "0"
									this.showNextPage(vnode)
								}
							})
						},
						type: ButtonType.Login,
					})
				}
			},
			Premium: createUpgradeButton(data, () => this.showNextPage(vnode), SubscriptionType.Premium),
			PremiumBusiness: createUpgradeButton(data, () => this.showNextPage(vnode), SubscriptionType.PremiumBusiness),
			Teams: createUpgradeButton(data, () => this.showNextPage(vnode), SubscriptionType.Teams),
			TeamsBusiness: createUpgradeButton(data, () => this.showNextPage(vnode), SubscriptionType.TeamsBusiness),
			Pro: createUpgradeButton(data, () => this.showNextPage(vnode), SubscriptionType.Pro)
		}
		return m("#upgrade-account-dialog.pt", [
				m(SubscriptionSelector, {
					options: data.options,
					campaignInfoTextId: data.campaignInfoTextId,
					boxWidth: 230,
					boxHeight: 250,
					planPrices: data.planPrices,
					isInitialUpgrade: data.upgradeType !== UpgradeType.Switch,
					currentSubscriptionType: data.currentSubscription,
					currentlySharingOrdered: false,
					currentlyBusinessOrdered: false,
					currentlyWhitelabelOrdered: false,
					orderedContactForms: 0,
					actionButtons: subscriptionActionButtons
				})
			]
		)
	}

	showNextPage(vnode: Vnode<WizardPageAttrs<UpgradeSubscriptionData>>): void {
		emitWizardEvent(vnode.dom, WizardEventType.SHOWNEXTPAGE)
	}
}


function createUpgradeButton(data: UpgradeSubscriptionData, showNextPage: () => void, subscriptionType: SubscriptionTypeEnum): Component {
	return {
		view: () => {
			return m(ButtonN, {
				label: "pricing.select_action",
				click: () => goToNextPage(data, showNextPage, subscriptionType),
				type: ButtonType.Login,
			})
		}
	}
}

function confirmFreeSubscription(): Promise<boolean> {
	return new Promise(resolve => {
		let oneAccountValue = stream(false)
		let privateUseValue = stream(false)

		const buttons: Array<ButtonAttrs> = [
			{label: "cancel_action", click: () => closeAction(false), type: ButtonType.Secondary},
			{
				label: "ok_action", click: () => {
					if (oneAccountValue() && privateUseValue()) {
						closeAction(true)
					}
				}, type: ButtonType.Primary
			},
		]
		let dialog: Dialog
		const closeAction = confirmed => {
			dialog.close()
			setTimeout(() => resolve(confirmed), DefaultAnimationTime)
		}

		dialog = new Dialog(DialogType.Alert, {
			view: () => [
				// m(".h2.pb", lang.get("confirmFreeAccount_label")),
				m("#dialog-message.dialog-contentButtonsBottom.text-break.text-prewrap.selectable", lang.getMaybeLazy("freeAccountInfo_msg")),
				m(".dialog-contentButtonsBottom", [
					m(CheckboxN, {
						label: () => lang.get("confirmNoOtherFreeAccount_msg"),
						checked: oneAccountValue
					}),
					m(CheckboxN, {
						label: () => lang.get("confirmPrivateUse_msg"),
						checked: privateUseValue
					}),
				]),
				m(".flex-center.dialog-buttons", buttons.map(a => m(ButtonN, a)))
			]
		}).setCloseHandler(() => closeAction(false))
		  .addShortcut({
			  key: Keys.ESC,
			  shift: false,
			  exec: () => closeAction(false),
			  help: "cancel_action"
		  })
		  .addShortcut({
			  key: Keys.RETURN,
			  shift: false,
			  exec: () => closeAction(true),
			  help: "ok_action",
		  })
		  .show()
	})
}

export class UpgradeSubscriptionPageAttrs implements WizardPageAttrs<UpgradeSubscriptionData> {

	data: UpgradeSubscriptionData
	subscriptionType: ?string

	constructor(upgradeData: UpgradeSubscriptionData) {
		this.data = upgradeData
	}

	headerTitle(): string {
		return lang.get("subscription_label")
	}

	nextAction(showErrorDialog: boolean): Promise<boolean> {
		// next action not available for this page
		return Promise.resolve(true)
	}

	isSkipAvailable(): boolean {
		return false
	}

	isEnabled(): boolean {
		return isTutanotaDomain() && !(isApp() && client.isIos())
	}

}

function gatherInformationForNextPage(subscriptionParameters: SubscriptionParameters, data: UpgradeSubscriptionData, showNextPage: () => void): void {
	if (subscriptionParameters.type === "private") {
		switch (subscriptionParameters.subscription) {
			case "free":
				confirmFreeSubscription().then(confirmed => {
					if (confirmed) {
						data.type = SubscriptionType.Free
						data.price = "0"
						data.priceNextYear = "0"
						showNextPage()
					}
				})
				break
			case "premium":
				goToNextPage(data, showNextPage, SubscriptionType.Premium)
				break
			case "teams":
				goToNextPage(data, showNextPage, SubscriptionType.Teams)
				break
			default:
				confirmFreeSubscription().then(confirmed => {
					if (confirmed) {
						data.type = SubscriptionType.Free
						data.price = "0"
						data.priceNextYear = "0"
						showNextPage()
					}
				})
				break
		}
	} else {
		switch (subscriptionParameters.subscription) {
			case "premium":
				goToNextPage(data, showNextPage, SubscriptionType.PremiumBusiness)
				break
			case "teams":
				goToNextPage(data, showNextPage, SubscriptionType.TeamsBusiness)
				break
			case "pro":
				goToNextPage(data, showNextPage, SubscriptionType.Pro)
				break
			default:
				confirmFreeSubscription().then(confirmed => {
					if (confirmed) {
						data.type = SubscriptionType.Free
						data.price = "0"
						data.priceNextYear = "0"
						showNextPage()
					}
				})
				break
		}
	}

}

function goToNextPage(data: UpgradeSubscriptionData, showNextPage: () => void, subscriptionType: SubscriptionTypeEnum): void {
	data.type = subscriptionType
	data.price = String(getSubscriptionPrice(data, data.type, UpgradePriceType.PlanActualPrice))
	let nextYear = String(getSubscriptionPrice(data, data.type, UpgradePriceType.PlanNextYearsPrice))
	data.priceNextYear = (data.price !== nextYear) ? nextYear : null
	showNextPage()
}
