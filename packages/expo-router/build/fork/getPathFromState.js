"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.appendBaseUrl = exports.decodeParams = exports.getPathDataFromState = exports.getPathFromState = void 0;
const native_1 = require("@react-navigation/native");
const queryString = __importStar(require("query-string"));
const getActiveRoute = (state) => {
    const route = typeof state.index === 'number'
        ? state.routes[state.index]
        : state.routes[state.routes.length - 1];
    if (route.state) {
        return getActiveRoute(route.state);
    }
    return route;
};
/**
 * Utility to serialize a navigation state object to a path string.
 *
 * @example
 * ```js
 * getPathFromState(
 *   {
 *     routes: [
 *       {
 *         name: 'Chat',
 *         params: { author: 'Jane', id: 42 },
 *       },
 *     ],
 *   },
 *   {
 *     screens: {
 *       Chat: {
 *         path: 'chat/:author/:id',
 *         stringify: { author: author => author.toLowerCase() }
 *       }
 *     }
 *   }
 * )
 * ```
 *
 * @param state Navigation state to serialize.
 * @param options Extra options to fine-tune how to serialize the path.
 * @returns Path representing the state, e.g. /foo/bar?count=42.
 */
function getPathFromState(state, options) {
    return getPathDataFromState(state, options).path;
}
exports.getPathFromState = getPathFromState;
function getPathDataFromState(state, { preserveDynamicRoutes, preserveGroups, ...options } = { screens: {} }) {
    if (state == null) {
        throw Error("Got 'undefined' for the navigation state. You must pass a valid state object.");
    }
    if (options) {
        (0, native_1.validatePathConfig)(options);
    }
    // Create a normalized configs object which will be easier to use
    const configs = options?.screens
        ? createNormalizedConfigs(options?.screens)
        : {};
    let path = '/';
    let current = state;
    const allParams = {};
    let hash;
    while (current) {
        let index = typeof current.index === 'number' ? current.index : 0;
        let route = current.routes[index];
        let pattern;
        let focusedParams;
        const focusedRoute = getActiveRoute(state);
        let currentOptions = configs;
        // Keep all the route names that appeared during going deeper in config in case the pattern is resolved to undefined
        const nestedRouteNames = [];
        let hasNext = true;
        while (route.name in currentOptions && hasNext) {
            pattern = currentOptions[route.name].pattern;
            nestedRouteNames.push(route.name);
            if (route.params) {
                // Start Fork
                if (route.params['#'] !== undefined) {
                    // route.params is frozen, so we need to clone it
                    const { '#': _hash, ...params } = route.params;
                    hash = _hash;
                    // route.params is readonly, so we need to make it a new object
                    // But we cannot change its identity as its used below
                    Object.assign(route, { params });
                }
                // End Fork
                const stringify = currentOptions[route.name]?.stringify;
                const currentParams = Object.fromEntries(
                // Start fork - better handle array params
                // Object.entries(route.params).map(([key, value]) => [
                //   key,
                //   stringify?.[key] ? stringify[key](value) : String(value),
                // ])
                Object.entries(route.params).map(([key, value]) => [
                    key,
                    stringify?.[key]
                        ? stringify[key](value)
                        : Array.isArray(value)
                            ? value.map(String)
                            : String(value),
                ])
                // End Fork
                );
                if (pattern) {
                    Object.assign(allParams, currentParams);
                }
                if (focusedRoute === route) {
                    // If this is the focused route, keep the params for later use
                    // We save it here since it's been stringified already
                    focusedParams = { ...currentParams };
                    pattern
                        ?.split('/')
                        .filter((p) => p.startsWith(':'))
                        // eslint-disable-next-line no-loop-func
                        .forEach((p) => {
                        const name = getParamName(p);
                        // Remove the params present in the pattern since we'll only use the rest for query string
                        if (focusedParams) {
                            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                            delete focusedParams[name];
                        }
                    });
                }
            }
            // If there is no `screens` property or no nested state, we return pattern
            if (!currentOptions[route.name].screens || route.state === undefined) {
                hasNext = false;
            }
            else {
                index =
                    typeof route.state.index === 'number' ? route.state.index : route.state.routes.length - 1;
                const nextRoute = route.state.routes[index];
                const nestedConfig = currentOptions[route.name].screens;
                // if there is config for next route name, we go deeper
                if (nestedConfig && nextRoute.name in nestedConfig) {
                    route = nextRoute;
                    currentOptions = nestedConfig;
                }
                else {
                    // If not, there is no sense in going deeper in config
                    hasNext = false;
                }
            }
        }
        if (pattern === undefined) {
            pattern = nestedRouteNames.join('/');
        }
        if (currentOptions[route.name] !== undefined) {
            path += pattern
                .split('/')
                .map((p) => {
                const name = getParamName(p);
                // We don't know what to show for wildcard patterns
                // Showing the route name seems ok, though whatever we show here will be incorrect
                // Since the page doesn't actually exist
                if (p === '*') {
                    return route.name;
                }
                // If the path has a pattern for a param, put the param in the path
                if (p.startsWith(':')) {
                    const value = allParams[name];
                    if (value === undefined && p.endsWith('?')) {
                        // Optional params without value assigned in route.params should be ignored
                        return '';
                    }
                    // Valid characters according to
                    // https://datatracker.ietf.org/doc/html/rfc3986#section-3.3 (see pchar definition)
                    return String(value).replace(/[^A-Za-z0-9\-._~!$&'()*+,;=:@]/g, (char) => encodeURIComponent(char));
                }
                return encodeURIComponent(p);
            })
                .join('/');
        }
        else {
            path += encodeURIComponent(route.name);
        }
        if (!focusedParams) {
            focusedParams = focusedRoute.params;
        }
        if (route.state) {
            path += '/';
        }
        else if (focusedParams) {
            for (const param in focusedParams) {
                if (focusedParams[param] === 'undefined') {
                    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                    delete focusedParams[param];
                }
            }
            // Start Fork
            // const query = queryString.stringify(focusedParams, { sort: false });
            const { '#': hash, ...focusedParamsWithoutHash } = focusedParams;
            const query = queryString.stringify(focusedParamsWithoutHash, { sort: false });
            // End Fork
            if (query) {
                path += `?${query}`;
            }
        }
        current = route.state;
    }
    // Remove multiple as well as trailing slashes
    path = path.replace(/\/+/g, '/');
    path = path.length > 1 ? path.replace(/\/$/, '') : path;
    // Include the root path if specified
    if (options?.path) {
        path = joinPaths(options.path, path);
    }
    if (hash) {
        allParams['#'] = hash;
        path += `#${hash}`;
    }
    path = appendBaseUrl(path);
    return { path, params: allParams };
}
exports.getPathDataFromState = getPathDataFromState;
function decodeParams(params) {
    const parsed = {};
    for (const [key, value] of Object.entries(params)) {
        try {
            if (key === 'params' && typeof value === 'object') {
                parsed[key] = decodeParams(value);
            }
            else if (Array.isArray(value)) {
                parsed[key] = value.map((v) => decodeURIComponent(v));
            }
            else {
                parsed[key] = decodeURIComponent(value);
            }
        }
        catch {
            parsed[key] = value;
        }
    }
    return parsed;
}
exports.decodeParams = decodeParams;
const getParamName = (pattern) => pattern.replace(/^:/, '').replace(/\?$/, '');
const joinPaths = (...paths) => []
    .concat(...paths.map((p) => p.split('/')))
    .filter(Boolean)
    .join('/');
const createConfigItem = (config, parentPattern) => {
    if (typeof config === 'string') {
        // If a string is specified as the value of the key(e.g. Foo: '/path'), use it as the pattern
        const pattern = parentPattern ? joinPaths(parentPattern, config) : config;
        return { pattern };
    }
    if (config.exact && config.path === undefined) {
        throw new Error("A 'path' needs to be specified when specifying 'exact: true'. If you don't want this screen in the URL, specify it as empty string, e.g. `path: ''`.");
    }
    // If an object is specified as the value (e.g. Foo: { ... }),
    // It can have `path` property and `screens` prop which has nested configs
    const pattern = config.exact !== true ? joinPaths(parentPattern || '', config.path || '') : config.path || '';
    const screens = config.screens ? createNormalizedConfigs(config.screens, pattern) : undefined;
    return {
        // Normalize pattern to remove any leading, trailing slashes, duplicate slashes etc.
        pattern: pattern?.split('/').filter(Boolean).join('/'),
        stringify: config.stringify,
        screens,
    };
};
const createNormalizedConfigs = (options, pattern) => Object.fromEntries(Object.entries(options).map(([name, c]) => {
    const result = createConfigItem(c, pattern);
    return [name, result];
}));
function appendBaseUrl(path, baseUrl = process.env.EXPO_BASE_URL) {
    if (process.env.NODE_ENV !== 'development') {
        if (baseUrl) {
            return `/${baseUrl.replace(/^\/+/, '').replace(/\/$/, '')}${path}`;
        }
    }
    return path;
}
exports.appendBaseUrl = appendBaseUrl;
//# sourceMappingURL=getPathFromState.js.map