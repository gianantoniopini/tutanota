declare type QueryValue = string | boolean | Array<QueryValue>

/** Top-level components accept route and query parameters as attrs */
type TopLevelComponentAttrs = {[string]: QueryValue}

declare type RouteResolverMatch = {
	onmatch(args: {[string]: QueryValue}, requestedPath: string): $Promisable<?MComponent<TopLevelComponentAttrs>>;
}

declare type RouteResolverRender = {
	render(vnode: Vnode<TopLevelComponentAttrs>): VirtualElement | Array<VirtualElement>;
}

declare type RouteResolver = (RouteResolverMatch & RouteResolverRender) | RouteResolverMatch | RouteResolverRender

/**
 * mithril component lifecycle methods: https://mithril.js.org/lifecycle-methods.html
 */
interface Lifecycle<Attrs> {
	// The oninit hook is called before a vnode is touched by the virtual DOM engine.
	+oninit?: (vnode: Vnode<Attrs>) => void;
	// The oncreate hook is called after a DOM element is created and attached to the document.
	+oncreate?: (vnode: VnodeDOM<Attrs>) => void;
	// The onbeforeremove hook is called before a DOM element is detached from the document.
	// If a Promise is returned, Mithril only detaches the DOM element after the promise completes.
	+onbeforeremove?: (vnode: VnodeDOM<Attrs>) => void | Promise<void>;
	// The onremove hook is called before a DOM element is removed from the document.
	+onremove?: (vnode: VnodeDOM<Attrs>) => void;
	// The onbeforeupdate hook is called before a vnode is diffed in a update.
	// if it returns false, Mithril prevents a diff from happening to the vnode,
	// and consequently to the vnode's children.
	+onbeforeupdate?: (vnode: Vnode<Attrs>, old: VnodeDOM<Attrs>) => boolean | void;
	// The onupdate hook is called after a DOM element is updated, while attached to the document.
	+onupdate?: (vnode: VnodeDOM<Attrs>) => void;
}

type LifecycleAttrs<T> = T & Lifecycle<T>

type Attrs = $ReadOnly<{[?string]: any}>

declare interface Router {
	(root: HTMLElement, defaultRoute: string, routes: {[string]: MComponent<TopLevelComponentAttrs> | RouteResolver}): void;

	set(path: string, data?: ?{[string]: mixed},
	    options?: {replace?: boolean, state?: ?Object, title?: ?string}): void;

	get(): string;

	param(): Object;

	param(key: string): string;

	prefix: string;

	Link: MComponent<any>;
}

declare interface Mithril {
	// We would like to write a definition which allows omitting Attrs if all keys are optional
	(component: string | MComponent<void> | Class<MComponent<void>>, children?: Children): Vnode<any>;

	<AttrsT: Attrs>(
		component: string | Class<MComponent<AttrsT>> | MComponent<AttrsT>,
		attributes: AttrsT,
		children?: Children
	): Vnode<any>;

	route: Router;

	redraw: () => void;

	fragment<Attrs: $ReadOnly<{[?string]: any}>>(attributes: Attrs, children?: Children): Vnode<any>;

	trust(html: string): Vnode<void>;

	withAttr(attrName: string, callback: Function): Function;

	buildQueryString(args: {[string]: any}): string;

	parseQueryString(queryString: string): {[string]: string};

	render(element: HTMLElement, vnodes: Children): void;
}

declare module 'mithril' {
	declare interface Router {
		(root: HTMLElement, defaultRoute: string, routes: {[string]: MComponent<mixed> | RouteResolver}): void;

		set(path: string, data?: ?{[string]: mixed},
		    options?: {replace?: boolean, state?: ?Object, title?: ?string}): void;

		get(): string;

		param(): Object;

		param(key: string): string;

		prefix: string;

		Link: MComponent<mixed>;
	}

	declare export default Mithril;
}

// TODO: think if they should be covariant. They probably should not be because they're not readonly
declare interface Stream<+T> {
	(): T;

	(T): T;

	map<R>(mapper: (T) => R): Stream<R>;

	end: Stream<boolean>;

	// Covariant breaks this
	// of(val?: T): Stream<T>;

	ap<U>(f: Stream<(value: T) => U>): Stream<U>;
}

// Partially taken from DefinitelyTyped
type StreamModule = {
	/** Creates a stream.*/<T>(value?: T): Stream<T>;
	/** Creates a computed stream that reactively updates if any of its upstreams are updated. Combiner accepts streams. */
	combine<T>(combiner: (...streams: any[]) => T, streams: Array<Stream<any>>): Stream<T>;
	/** Creates a computed stream that reactively updates if any of its upstreams are updated. Combiner accepts values. */
	lift<T>(combiner: (...values: any[]) => T, ...streams: Array<Stream<any>>): Stream<T>;
	/** Creates a stream whose value is the array of values from an array of streams. */
	merge(streams: Array<Stream<any>>): Stream<any[]>;
	/** Creates a new stream with the results of calling the function on every incoming stream with and accumulator and the incoming value. */
	scan<T, U>(fn: (acc: U, value: T) => U, acc: U, stream: Stream<T>): Stream<U>;
	/** Takes an array of pairs of streams and scan functions and merges all those streams using the given functions into a single stream. */
	scanMerge<T, U>(pairs: Array<[Stream<T>, (acc: U, value: T) => U]>, acc: U): Stream<U>;
	/** Takes an array of pairs of streams and scan functions and merges all those streams using the given functions into a single stream. */
	scanMerge<U>(pairs: Array<[Stream<any>, (acc: U, value: any) => U]>, acc: U): Stream<U>;
	/** A special value that can be returned to stream callbacks to halt execution of downstreams. */
	+HALT: {||};
}

declare module 'mithril/stream/stream.js' {
	declare export default StreamModule;
}

type ComparisonDescriptor = (string) => void;
type DoneFn = () => void;
type TimeoutFn = (number) => void;

type OspecSpy<T> = T & {
	/** Last invocation */
	args: $ReadOnlyArray<any>,
	/** All invocations */
	calls: $ReadOnlyArray<{this: any, args: $ReadOnlyArray<any>}>,
	callCount: number,
}

interface Ospec {
	<T>(T): {
		equals: (T) => ComparisonDescriptor,
		deepEquals: (T) => ComparisonDescriptor,
		notEquals: (T) => ComparisonDescriptor,
		notDeepEquals: (T) => ComparisonDescriptor,
		// Throws can be used when function is passed but Flow can't distinguish them currently
		throws: (Class<any>) => void
	};

	(string, (done: DoneFn, timeout: TimeoutFn) => mixed): void;

	spec: (string, () => mixed) => void;
	only: (string, (done: DoneFn, timeout: TimeoutFn) => mixed) => void;
	before: ((DoneFn, TimeoutFn) => mixed) => void;
	after: ((DoneFn, TimeoutFn) => mixed) => void;
	beforeEach: ((DoneFn, TimeoutFn) => mixed) => void;
	afterEach: ((DoneFn, TimeoutFn) => mixed) => void;

	spy(): OspecSpy<() => void>;

	spy<T>(T): OspecSpy<T>;

	timeout: (number) => void;
	specTimeout: (number) => void;
	report: (results: mixed, stats: mixed) => number;
}

declare module 'ospec' {
	declare export default Ospec;
}

declare module 'mockery' {
	declare export default any;
}

declare module 'faker' {
	declare export default any;
}
declare module 'squire-rte' {
	declare var Squire: any;
}

declare type SanitizeConfigBase = {
	SAFE_FOR_JQUERY?: boolean,
	SAFE_FOR_TEMPLATES?: boolean,
	ALLOWED_TAGS?: Array<string>,
	ALLOWED_ATTR?: Array<string>,
	USE_PROFILES?: {
		html?: boolean,
		svg?: boolean,
		svgFilters?: boolean,
		mathMl?: boolean
	},
	FORBID_TAGS?: Array<string>,
	FORBID_ATTR?: Array<string>,
	ADD_TAGS?: Array<string>,
	ALLOW_DATA_ATTR?: boolean,
	ALLOW_UNKNOWN_PROTOCOLS?: boolean,
	ALLOWED_URI_REGEXP?: RegExp,
	RETURN_DOM_IMPORT?: boolean,
	WHOLE_DOCUMENT?: boolean,
	SANITIZE_DOM?: boolean,
	KEEP_CONTENT?: boolean,
	FORCE_BODY?: boolean,
}

declare type SanitizeConfig = SanitizeConfigBase & {RETURN_DOM?: boolean} & {RETURN_DOM_FRAGMENT?: boolean}

type DOMPurifyHooks =
	| "beforeSanitizeElements"
	| "uponSanitizeElement"
	| "afterSanitizeElements"
	| "beforeSanitizeAttributes"
	| "uponSanitizeAttribute"
	| "afterSanitizeAttributes"
	| "beforeSanitizeShadowDOM"
	| "uponSanitizeShadowNode"
	| "afterSanitizeShadowDOM"

declare interface IDOMPurify {
	sanitize(html: string | HTMLElement, options: SanitizeConfigBase & {RETURN_DOM_FRAGMENT: true}): DocumentFragment;

	sanitize(html: string | HTMLElement, options: SanitizeConfigBase & {RETURN_DOM: true}): HTMLElement;

	sanitize(html: string | HTMLElement, options?: SanitizeConfigBase): string;

	addHook<T : SanitizeConfigBase>(hook: DOMPurifyHooks, (node: HTMLElement, data: Object, config: T) => HTMLElement): void;

	isSupported: boolean;
}

declare module 'dompurify' {
	declare export default IDOMPurify;
}
declare module '@hot' { // hmr, access to previously loaded module
	declare export default any;
	declare export var module: any;
}
// https://soapbox.github.io/linkifyjs/docs/options.html
type LinkifyOptions = {|
	attributes?: Object | (href: string, type: string) => Object,
	target?: string,
	validate?: {
		url: (value: string, type: string) => boolean
	}
|}
declare module 'linkify/html' {
	declare export default function linkifyHtml(html: string, options: LinkifyOptions): string
}

declare module 'qrcode' {
	declare export default any;
}

declare type Squire = any

declare var tutao: {
	currentView: any;
	m: Mithril
}

declare class ContactFindOptions { // cordova contact plugin
	filter: string,
	multiple: boolean,
	fields: string[],
	desiredFields: string[]
}

interface Attributes {
	[key: string]: any;
}

type $Attrs<+T> = $ReadOnly<T>

// Declared at the top level to not import it in all places
interface MComponent<-Attrs> extends Lifecycle<Attrs> {
	/** Creates a view out of virtual elements. */
	view(vnode: Vnode<Attrs>): Children;
}

export type Child = Vnode<any> | string | number | boolean | null;
export type ChildArray = Array<Children>;
export type Children = Child | ChildArray;

export interface Vnode<Attrs> extends Lifecycle<Attrs> {
	attrs: Attrs,
	children: ChildArray,
	dom: HTMLElement,
}

export interface VnodeDOM<Attrs> extends Vnode<Attrs> {
	attrs: Attrs,
	dom: HTMLElement,
}

// override flowlib to include "hot"
declare var module: {
	exports: any,
	require(id: string): any,
	id: string,
	filename: string,
	loaded: boolean,
	parent: any,
	children: Array<any>,
	builtinModules: Array<string>,
	hot: ?{
		data?: {[string]: mixed},
		dispose: ((data: {[string]: mixed}) => mixed) => void,
		accept: (() => mixed) => void
	},
	...
};