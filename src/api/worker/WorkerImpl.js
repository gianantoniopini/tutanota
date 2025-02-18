// @flow
import {errorToObj, Queue, Request} from "../common/WorkerProtocol"
import {CryptoError} from "../common/error/CryptoError"
import {bookingFacade} from "./facades/BookingFacade"
import {NotAuthenticatedError} from "../common/error/RestError"
import {ProgrammingError} from "../common/error/ProgrammingError"
import {initLocator, locator, resetLocator} from "./WorkerLocator"
import {_service} from "./rest/ServiceRestClient"
import {random} from "./crypto/Randomizer"
import {assertWorkerOrNode, isMainOrNode} from "../common/Env"
import {nativeApp} from "../../native/common/NativeWrapper"
import {TotpVerifier} from "./crypto/TotpVerifier"
import type {EntropySrcEnum} from "../common/TutanotaConstants"
import {loadContactForm} from "./facades/ContactFormFacade"
import {base64ToKey, keyToBase64} from "./crypto/CryptoUtils"
import {aes256RandomKey} from "./crypto/Aes"
import type {BrowserData} from "../../misc/ClientConstants"
import type {InfoMessage} from "../common/CommonTypes"
import {resolveSessionKey} from "./crypto/CryptoFacade"
import {downcast} from "../common/utils/Utils"
import type {ContactFormAccountReturn} from "../entities/tutanota/ContactFormAccountReturn"
import type {PaymentDataServicePutReturn} from "../entities/sys/PaymentDataServicePutReturn"
import type {EntityUpdate} from "../entities/sys/EntityUpdate"
import type {WebsocketCounterData} from "../entities/sys/WebsocketCounterData"
import type {ProgressMonitorId} from "../common/utils/ProgressMonitor";
import type {WebsocketLeaderStatus} from "../entities/sys/WebsocketLeaderStatus"
import type {User} from "../entities/sys/User"
import {urlify} from "./Urlifier"
import type {SearchIndexStateInfo} from "./search/SearchTypes"
import {delay} from "../common/utils/PromiseUtils"


assertWorkerOrNode()

export class WorkerImpl {

	_queue: Queue;
	_newEntropy: number;
	_lastEntropyUpdate: number;

	constructor(self: ?DedicatedWorkerGlobalScope, browserData: BrowserData) {
		if (browserData == null) {
			throw new ProgrammingError("Browserdata is not passed")
		}
		const workerScope = self
		this._queue = new Queue(workerScope)
		nativeApp.setWorkerQueue(this._queue)
		this._newEntropy = -1
		this._lastEntropyUpdate = new Date().getTime()

		initLocator(this, browserData);

		this._queue.setCommands({
			testEcho: (message: any) => Promise.resolve({msg: ">>> " + message.args[0].msg}),
			testError: (message: any) => {
				const errorTypes = {
					ProgrammingError,
					CryptoError,
					NotAuthenticatedError
				}
				let ErrorType = errorTypes[message.args[0].errorType]
				return Promise.reject(new ErrorType(`wtf: ${message.args[0].errorType}`))
			},
			generateSignupKeys: (message: Request) => {
				return locator.customer.generateSignupKeys(...message.args)
			},
			signup: (message: Request) => {
				return locator.customer.signup(...message.args)
			},
			createContactFormUserGroupData: (message: Request) => {
				return locator.customer.createContactFormUserGroupData(...message.args)
			},
			createContactFormUser: (message: Request): Promise<ContactFormAccountReturn> => {
				return locator.customer.createContactFormUser(...message.args)
			},
			createSession: (message: Request) => {
				return locator.login.createSession(...message.args)
			},
			createExternalSession: (message: Request) => {
				return locator.login.createExternalSession(...message.args)
			},
			reset: (message: Request) => {
				return resetLocator()
			},
			resumeSession: (message: Request) => {
				return locator.login.resumeSession(...message.args)
			},
			deleteSession: (message: Request) => {
				return locator.login.deleteSession(...message.args)
			},
			changePassword: (message: Request) => {
				return locator.login.changePassword(...message.args)
			},
			deleteAccount: (message: Request) => {
				return locator.login.deleteAccount(...message.args)
			},
			createMailFolder: (message: Request) => {
				return locator.mail.createMailFolder(...message.args)
			},
			createMailDraft: (message: Request) => {
				return locator.mail.createDraft(...message.args)
			},
			updateMailDraft: (message: Request) => {
				return locator.mail.updateDraft(...message.args)
			},
			sendMailDraft: (message: Request) => {
				return locator.mail.sendDraft(...message.args)
			},
			readAvailableCustomerStorage: (message: Request) => {
				return locator.customer.readAvailableCustomerStorage(...message.args)
			},
			readUsedCustomerStorage: (message: Request) => {
				return locator.customer.readUsedCustomerStorage(...message.args)
			},
			restRequest: (message: Request) => {
				message.args[3] = Object.assign(locator.login.createAuthHeaders(), message.args[3])
				return locator.restClient.request(...message.args)
			},
			entityRequest: (message: Request) => {
				return locator.cache.entityRequest(...message.args)
			},
			serviceRequest: (message: Request) => {
				return _service.apply(null, message.args)
			},
			downloadFileContent: (message: Request) => {
				return locator.file.downloadFileContent(...message.args)
			},
			downloadFileContentNative: (message: Request) => {
				return locator.file.downloadFileContentNative(...message.args)
			},
			uploadBlob: (message: Request) => {
				return locator.file.uploadBlob(...message.args)
			},
			downloadBlob: (message: Request) => {
				return locator.file.downloadBlob(...message.args)
			},
			addMailAlias: (message: Request) => {
				return locator.mailAddress.addMailAlias(...message.args)
			},
			setMailAliasStatus: (message: Request) => {
				return locator.mailAddress.setMailAliasStatus(...message.args)
			},
			isMailAddressAvailable: (message: Request) => {
				return locator.mailAddress.isMailAddressAvailable(...message.args)
			},
			getAliasCounters: (message: Request) => {
				return locator.mailAddress.getAliasCounters(...message.args)
			},
			changeUserPassword: (message: Request) => {
				return locator.userManagement.changeUserPassword(...message.args)
			},
			changeAdminFlag: (message: Request) => {
				return locator.userManagement.changeAdminFlag(...message.args)
			},
			updateAdminship: (message: Request) => {
				return locator.userManagement.updateAdminship(...message.args)
			},
			switchFreeToPremiumGroup(message: Request): Promise<void> {
				return locator.customer.switchFreeToPremiumGroup(...message.args)
			},
			switchPremiumToFreeGroup(message: Request): Promise<void> {
				return locator.customer.switchPremiumToFreeGroup(...message.args)
			},
			updatePaymentData(message: Request): Promise<PaymentDataServicePutReturn> {
				return locator.customer.updatePaymentData(...message.args)
			},
			downloadInvoice(message: Request): Promise<DataFile> {
				return locator.customer.downloadInvoice(...message.args)
			},
			readUsedUserStorage: (message: Request) => {
				return locator.userManagement.readUsedUserStorage(...message.args)
			},
			deleteUser: (message: Request) => {
				return locator.userManagement.deleteUser(...message.args)
			},
			getPrice: (message: Request) => {
				return bookingFacade.getPrice(...message.args)
			},
			getCurrentPrice: (message: Request) => {
				return bookingFacade.getCurrentPrice()
			},

			loadCustomerServerProperties: (message: Request) => {
				return locator.customer.loadCustomerServerProperties(...message.args)
			},
			addSpamRule: (message: Request) => {
				return locator.customer.addSpamRule(...message.args)
			},
			editSpamRule: (message: Request) => {
				return locator.customer.editSpamRule(...message.args)
			},
			createUser: (message: Request) => {
				return locator.userManagement.createUser(...message.args)
			},
			readUsedGroupStorage: (message: Request) => {
				return locator.groupManagement.readUsedGroupStorage(...message.args)
			},
			createMailGroup: (message: Request) => {
				return locator.groupManagement.createMailGroup(...message.args)
			},
			createLocalAdminGroup: (message: Request) => {
				return locator.groupManagement.createLocalAdminGroup(...message.args)
			},
			addUserToGroup: (message: Request) => {
				return locator.groupManagement.addUserToGroup(...message.args)
			},
			removeUserFromGroup: (message: Request) => {
				return locator.groupManagement.removeUserFromGroup(...message.args)
			},
			deactivateGroup: (message: Request) => {
				return locator.groupManagement.deactivateGroup(...message.args)
			},
			loadContactFormByPath: (message: Request) => {
				return loadContactForm.apply(null, message.args)
			},
			addDomain: (message: Request) => {
				return locator.customer.addDomain(...message.args)
			},
			removeDomain: (message: Request) => {
				return locator.customer.removeDomain(...message.args)
			},
			setCatchAllGroup: (message: Request) => {
				return locator.customer.setCatchAllGroup(...message.args)
			},
			orderWhitelabelCertificate: (message: Request) => {
				return locator.customer.orderWhitelabelCertificate.apply(locator.customer, message.args)
			},
			deleteCertificate: (message: Request) => {
				return locator.customer.deleteCertificate(...message.args)
			},
			generateTotpSecret: async (message: Request) => {
				const totp = await this.getTotpVerifier()
				return totp.generateSecret(...message.args)
			},
			generateTotpCode: async (message: Request) => {
				const totp = await this.getTotpVerifier()
				return totp.generateTotp(...message.args)
			},
			search: (message: Request) => {
				return locator.search.search(...message.args)
			},
			enableMailIndexing: (message: Request) => {
				return locator.indexer.enableMailIndexing()
			},
			disableMailIndexing: (message: Request) => {
				return locator.indexer.disableMailIndexing("requested by the user")
			},

			extendMailIndex: (message: Request) => {
				return locator.indexer.extendMailIndex(...message.args)
			},
			cancelMailIndexing: (message: Request) => {
				return locator.indexer.cancelMailIndexing()
			},
			readCounterValue: (message: Request) => {
				return locator.counters.readCounterValue(...message.args)
			},
			cancelCreateSession: (message: Request) => {
				locator.login.cancelCreateSession()
				return Promise.resolve()
			},
			entropy: (message: Request) => {
				return this.addEntropy(message.args[0])
			},
			tryReconnectEventBus(message: Request) {
				locator.eventBusClient.tryReconnect(...message.args)
				return Promise.resolve()
			},
			generateSsePushIdentifer: () => {
				return Promise.resolve(keyToBase64(aes256RandomKey()))
			},
			decryptUserPassword: (message: Request) => {
				return locator.login.decryptUserPassword(...message.args)
			},
			closeEventBus: (message: Request) => {
				locator.eventBusClient.close(message.args[0])
				return Promise.resolve()
			},
			getMoreSearchResults: (message: Request) => {
				return locator.search.getMoreSearchResults(...message.args).then(() => message.args[0])
			},
			getRecoveryCode: (message: Request) => {
				return locator.login.getRecoverCode(...message.args)
			},
			createRecoveryCode: (message: Request) => {
				return locator.login.createRecoveryCode(...message.args)
			},
			recoverLogin: (message: Request) => {
				return locator.login.recoverLogin(...message.args)
			},
			resetSecondFactors: (message: Request) => {
				return locator.login.resetSecondFactors(...message.args)
			},
			takeOverDeletedAddress: (message: Request) => {
				return locator.login.takeOverDeletedAddress(...message.args)
			},
			resetSession: () => locator.login.reset(),
			createCalendarEvent: (message: Request) => {
				return locator.calendar.createCalendarEvent(...message.args)
			},
			updateCalendarEvent: (message: Request) => {
				return locator.calendar.updateCalendarEvent(...message.args)
			},
			resolveSessionKey: (message: Request) => {
				return resolveSessionKey.apply(null, message.args).then(sk => sk ? keyToBase64(sk) : null)
			},
			addCalendar: (message: Request) => {
				return locator.calendar.addCalendar(...message.args)
			},
			scheduleAlarmsForNewDevice: (message: Request) => {
				return locator.calendar.scheduleAlarmsForNewDevice(...message.args)
			},
			loadAlarmEvents: (message: Request) => {
				return locator.calendar.loadAlarmEvents(...message.args)
			},
			getDomainValidationRecord: (message: Request) => {
				return locator.customer.getDomainValidationRecord(...message.args)
			},
			visibilityChange: (message: Request) => {
				locator.indexer.onVisibilityChanged(...message.args)
				return Promise.resolve()
			},
			getLog: () => {
				const global = downcast(self)
				if (global.logger) {
					return Promise.resolve(global.logger.getEntries())
				} else {
					return Promise.resolve([])
				}
			},
			sendGroupInvitation: (message: Request) => {
				return locator.share.sendGroupInvitation(...message.args)
			},
			acceptGroupInvitation: (message: Request) => {
				return locator.share.acceptGroupInvitation(...message.args)
			},
			rejectGroupInvitation: (message: Request) => {
				return locator.share.rejectGroupInvitation(...message.args)
			},
			checkMailForPhishing: (message: Request) => {
				return locator.mail.checkMailForPhishing(...message.args)
			},
			getEventByUid: (message: Request) => {
				return locator.calendar.getEventByUid(...message.args)
			},

			generateGiftCard: (message: Request) => {
				return locator.giftCards.generateGiftCard(message.args[0], message.args[1], message.args[2])
			},

			getGiftCardInfo: (message: Request) => {
				return locator.giftCards.getGiftCardInfo(message.args[0], base64ToKey(message.args[1]))
			},
			redeemGiftCard: (message: Request) => {
				return locator.giftCards.redeemGiftCard(message.args[0], base64ToKey(message.args[1]))
			},
			addExternalImageRule: (message: Request) => {
				return locator.configFacade.addExternalImageRule(...message.args)
			},
			getExternalImageRule: (message: Request) => {
				return locator.configFacade.getExternalImageRule(...message.args)
			},
			createTemplateGroup: (message: Request) => {
				return locator.groupManagement.createTemplateGroup(...message.args)
			},
			urlify: async (message: Request) => {
				const html: string = message.args[0]
				return Promise.resolve(urlify(html))
			}
		})

		// only register oncaught error handler if we are in the *real* worker scope
		// Otherwise uncaught error handler might end up in an infinite loop for test cases.
		if (workerScope && !isMainOrNode()) {
			// $FlowIssue[incompatible-call]
			workerScope.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
				this.sendError(event.reason)
			})

			workerScope.onerror = (e: string | Event, source, lineno, colno, error) => {
				console.error("workerImpl.onerror", e, source, lineno, colno, error)
				if (error instanceof Error) {
					this.sendError(error)
				} else {
					const err = new Error(e)
					err.lineNumber = lineno
					err.columnNumber = colno
					err.fileName = source
					this.sendError(err)
				}
				return true
			}
		}
	}

	getTotpVerifier(): Promise<TotpVerifier> {
		return Promise.resolve(new TotpVerifier())
	}

	/**
	 * Adds entropy to the randomizer. Updated the stored entropy for a user when enough entropy has been collected.
	 * @param entropy
	 * @returns {Promise.<void>}
	 */
	addEntropy(entropy: {source: EntropySrcEnum, entropy: number, data: number | Array<number>}[]): Promise<void> {
		try {
			return random.addEntropy(entropy)
		} finally {
			this._newEntropy = this._newEntropy + entropy.reduce((sum, value) => value.entropy + sum, 0)
			let now = new Date().getTime()
			if (this._newEntropy > 5000 && (now - this._lastEntropyUpdate) > 1000 * 60 * 5) {
				this._lastEntropyUpdate = now
				this._newEntropy = 0
				locator.login.storeEntropy()
			}
		}
	}

	entityEventsReceived(data: EntityUpdate[], eventOwnerGroupId: Id): Promise<void> {
		return this._queue.postMessage(new Request("entityEvent", [data, eventOwnerGroupId]))
	}

	sendError(e: Error): Promise<void> {
		return this._queue.postMessage(new Request("error", [errorToObj(e)]))
	}

	sendProgress(progressPercentage: number): Promise<void> {
		return this._queue.postMessage(new Request("progress", [progressPercentage])).then(() => {
			// the worker sometimes does not send the request if it does not get time
			return delay(0)
		})
	}

	sendIndexState(state: SearchIndexStateInfo): Promise<void> {
		return this._queue.postMessage(new Request("updateIndexState", [state]))
	}

	updateWebSocketState(state: WsConnectionState): Promise<void> {
		console.log("ws displayed state: ", state)
		return this._queue.postMessage(new Request("updateWebSocketState", [state]))
	}

	updateCounter(update: WebsocketCounterData): Promise<void> {
		return this._queue.postMessage(new Request("counterUpdate", [update]))
	}

	infoMessage(message: InfoMessage): Promise<void> {
		return this._queue.postMessage(new Request("infoMessage", [message]))
	}

	createProgressMonitor(totalWork: number): Promise<ProgressMonitorId> {
		return this._queue.postMessage(new Request("createProgressMonitor", [totalWork]))
	}

	progressWorkDone(reference: ProgressMonitorId, totalWork: number): Promise<void> {
		return this._queue.postMessage(new Request("progressWorkDone", [reference, totalWork]))
	}

	updateLeaderStatus(status: WebsocketLeaderStatus): Promise<void> {
		return this._queue.postMessage(new Request("updateLeaderStatus", [status]))
	}

	writeIndexerDebugLog(reason: string, user: User): Promise<void> {
		return this._queue.postMessage(new Request("writeIndexerDebugLog", [reason, user]))
	}
}


