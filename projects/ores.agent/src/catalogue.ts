// SPDX-License-Identifier: GPL-3.0-or-later
import { z } from 'zod';
import { tools } from './tools.js';
import { discoveryTools } from './discovery.js';
import { reportingTools } from './reporting.js';
import { scopeTools } from './scope-reporting.js';
import type { RequestPlan } from './intent.js';
import { analyticsTools } from './fx-analytics.js';
import { marketCurveTools } from './fx-market-curve.js';

const definitions = Object.entries(tools).map(([name, spec]) => ({
    type: 'function',
    function: {
        name,
        description: spec.description,
        parameters: z.toJSONSchema(spec.schema, { io: 'input' }),
    },
}));
const routes: Record<RequestPlan['route'] | 'help', Set<string>> = {
    help: new Set(['search_help']),
    analytics: new Set([...Object.keys(analyticsTools), ...Object.keys(marketCurveTools)]),
    scope: new Set(Object.keys(scopeTools)),
    reporting: new Set([...Object.keys(reportingTools), 'find_trades']),
    discovery: new Set([...Object.keys(discoveryTools), 'list_currencies']),
    market: new Set(
        Object.keys(tools).filter(
            (name) =>
                name !== 'search_help' &&
                !Object.hasOwn(discoveryTools, name) &&
                !Object.hasOwn(reportingTools, name) &&
                !Object.hasOwn(scopeTools, name) &&
                !Object.hasOwn(analyticsTools, name) &&
                !Object.hasOwn(marketCurveTools, name),
        ),
    ),
};
export function catalogue(route: keyof typeof routes) {
    return definitions.filter((tool) => routes[route].has(tool.function.name));
}
