import assert from 'node:assert/strict';
import test from 'node:test';
import { Agent } from '../dist/agent.js';
import { ToolExecutor } from '../dist/tools.js';
import { version } from '../dist/version.js';

const session = () => ({
    active: true,
    expires: Date.now() + 60_000,
    chatBusy: false,
    window: Date.now(),
    calls: 0,
    busy: 0,
});
const signal = new AbortController().signal;
const executor = new ToolExecutor({
    request: async () => assert.fail('Help must not query business data'),
}, () => {});

test('chat answers a known how-to with bundled instructions and a source', async () => {
    const agent = new Agent(
        { complete: async () => assert.fail('A direct help match needs no inference') },
        executor,
        undefined,
        { handle: async () => assert.fail('A how-to must bypass action handlers') },
    );
    const reply = await agent.chat(
        { message: 'How do I run a report in the web app?' }, session(), signal,
    );
    assert.match(reply.answer, /Run now/);
    assert.match(reply.answer, /\[Source\]\(https:\/\/github\.com\//);
    assert.equal(reply.evidence[0].tool, 'search_help');
    assert.equal(reply.evidence[0].version, version);
});

test('the model can refine a missed lookup through the help tool only', async () => {
    let inferenceCalls = 0;
    const agent = new Agent({
        complete: async (_, catalogue) => {
            inferenceCalls++;
            assert.deepEqual(catalogue.map((tool) => tool.function.name), ['search_help']);
            return {
                role: 'assistant',
                content: null,
                tool_calls: [{
                    id: 'help',
                    type: 'function',
                    function: {
                        name: 'search_help',
                        arguments: JSON.stringify({ query: 'download report results' }),
                    },
                }],
            };
        },
    }, executor);
    const reply = await agent.chat(
        { message: 'Where can I grab the artefacts my overnight batch generated?' },
        session(),
        signal,
    );
    assert.equal(inferenceCalls, 1);
    assert.deepEqual(reply.evidence.map(({ status }) => status), ['not_found', 'ok']);
    assert.match(reply.answer, /Downloads/);
});

test('missing help does not use an unsupported answer from the model', async () => {
    const agent = new Agent({
        complete: async () => ({ role: 'assistant', content: 'Invented steps' }),
    }, executor);
    const reply = await agent.chat(
        { message: 'How do I create a dashboard in the web app?' }, session(), signal,
    );
    assert.match(reply.answer, /no matching instructions/);
    assert.equal(reply.evidence[0].status, 'not_found');
});

test('record requests continue to use the business tool catalogue', async () => {
    const agent = new Agent({
        complete: async (_, catalogue) => {
            const names = catalogue.map((tool) => tool.function.name);
            assert.ok(names.includes('find_books'));
            assert.ok(!names.includes('search_help'));
            return { role: 'assistant', content: 'fixture' };
        },
    }, executor);
    const reply = await agent.chat({ message: 'Show my books' }, session(), signal);
    assert.equal(reply.answer, 'fixture');
});
