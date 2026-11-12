// SPDX-License-Identifier: GPL-3.0-or-later
import { z } from 'zod';
import { tools } from './tools.js';
import { discoveryTools } from './discovery.js';
import { reportingTools } from './reporting.js';
import { scopeTools } from './scope-reporting.js';
import type { RequestPlan } from './intent.js';
import { analyticsTools } from './fx-analytics.js';
import { marketCurveTools } from './fx-market-curve.js';
import { markdownText } from './markdown.js';

const defineTool = (name: string, spec: { description: string; schema: z.ZodType }) => ({
    type: 'function',
    function: {
        name,
        description: spec.description,
        parameters: z.toJSONSchema(spec.schema, { io: 'input' }),
    },
});
const definitions = Object.entries(tools).map(([name, spec]) => defineTool(name, spec));
const inspectionInput = z
    .object({
        name: z.string().trim().min(1).max(128).optional(),
    })
    .strict();
export const toolInspector = defineTool('inspect_tools', {
    description:
        'Answer questions about the tools the OreStudio chat agent can use. Omit name to list every registered tool. Supply a tool name to show its description and exact function definition, including its input schema. This searches the full registry regardless of which tools are offered for this turn.',
    schema: inspectionInput,
});
const chatDefinitions = [...definitions, toolInspector];
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

export function inspectTools(input: unknown): string {
    const { name } = inspectionInput.parse(input);
    if (!name) {
        return (
            'The agent has these registered tools:\n\n' +
            chatDefinitions.map(({ function: tool }) => '- `' + tool.name + '`').join('\n')
        );
    }
    const match = chatDefinitions.find(({ function: tool }) => tool.name === name.toLowerCase());
    if (!match) return `I don’t have a registered tool named “${markdownText(name)}”.`;
    return [
        `\`${match.function.name}\` is available. ${match.function.description}`,
        '\n```json',
        JSON.stringify(match, null, 2),
        '```',
    ].join('\n');
}
