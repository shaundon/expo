import type { ParsedRoute } from './getStateFromPath';
export declare function mutateRouteParams(route: ParsedRoute, params: object): void;
export declare function parseQueryParams(path: string, parseConfig?: Record<string, (value: string) => any>, hash?: string): Record<string, string | string[]> | undefined;
//# sourceMappingURL=getStateFromPath-forks.d.ts.map