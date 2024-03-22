"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseQueryParams = exports.mutateRouteParams = void 0;
function mutateRouteParams(route, params) {
    route.params = Object.assign(Object.create(null), route.params);
    for (const [name, value] of Object.entries(params)) {
        if (route.params?.[name]) {
            if (process.env.NODE_ENV !== 'production') {
                console.warn(`Route '/${route.name}' with param '${name}' was specified both in the path and as a param, removing from path`);
            }
        }
        if (!route.params?.[name]) {
            route.params[name] = value;
            continue;
        }
    }
    if (Object.keys(route.params).length === 0) {
        delete route.params;
    }
}
exports.mutateRouteParams = mutateRouteParams;
function parseQueryParams(path, parseConfig, hash) {
    const searchParams = new URL(path, 'https://phony.example').searchParams;
    const params = Object.create(null);
    if (hash) {
        params['#'] = hash;
    }
    for (const name of searchParams.keys()) {
        const values = parseConfig?.hasOwnProperty(name)
            ? searchParams.getAll(name).map((value) => parseConfig[name](value))
            : searchParams.getAll(name);
        // searchParams.getAll returns an array.
        // if we only have a single value, and its not an array param, we need to extract the value
        params[name] = values.length === 1 ? values[0] : values;
    }
    return Object.keys(params).length ? params : undefined;
}
exports.parseQueryParams = parseQueryParams;
//# sourceMappingURL=getStateFromPath-forks.js.map