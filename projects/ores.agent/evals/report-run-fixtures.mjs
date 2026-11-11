// SPDX-License-Identifier: GPL-3.0-or-later
import { fixtureBackend, fixtureIds } from './fixtures.mjs';
import { referenceSensitivities } from './sensitivity-reference.mjs';
export function reportFixtureBackend(scenario = 'default', caseId) {
    const backend = fixtureBackend(scenario);
    const reference = referenceSensitivities(caseId);
    return {
        ...backend,
        request: async (op, args, session, signal) => {
            if (op === 'reportDefinitions') {
                return {
                    result: { outcome: 'ok' },
                    total: 1,
                    definitions: [
                        {
                            id: fixtureIds.definition,
                            tenant_id: fixtureIds.tenant,
                            party_id: fixtureIds.party,
                            name: 'Fixture NPV',
                            version: 1,
                            report_type: 'risk',
                            pre_processing: 'execute',
                            post_processing: 'execute',
                            skipped_families: '',
                            cut_kind_code: null,
                            cut_id: null,
                        },
                    ],
                };
            }
            if (op === 'runDocument' && args.report_definition_id === fixtureIds.definition) {
                return {
                    success: true,
                    party_id: fixtureIds.party,
                    document: {
                        settings: {
                            tenant_id: fixtureIds.tenant,
                            party_id: fixtureIds.party,
                            market_data_type: 'date',
                            market_data_date: '2026-11-06',
                            base_currency: 'GBP',
                        },
                        analytics: [{ analytic: { analytic_type_code: 'npv', active: 'Y' } }],
                    },
                };
            }
            if (op === 'runResults') {
                const page = await backend.request(op, args, session, signal);
                return { ...page, results: page.results.map(row => row.measure === 'npv_base' ? { ...row, currency: '' } : row) };
            }
            if (op === 'reportMetrics' && args.filter.subject_id) {
                const page = await backend.request(op, { ...args, offset: 0 }, session, signal);
                const selected = page.metrics.filter(row => row.subject_id === args.filter.subject_id);
                return { ...page, total: selected.length, metrics: selected.slice(args.offset, args.offset + args.limit) };
            }
            if (op === 'reportMetrics' && reference && args.filter.family === 'sensitivity_report') {
                const rows = reference.metrics.filter(row =>
                    args.filter.report_instance_id === row.report_instance_id &&
                    args.filter.subject_id_one_of.includes(row.subject_id) && args.filter.measure_one_of.includes(row.measure));
                return { result: { outcome: 'ok' }, total: rows.length, metrics: rows.slice(args.offset, args.offset + args.limit) };
            }
            if (op !== 'runHealthBatch') return backend.request(op, args, session, signal);
            const health = [];
            for (const id of args.instance_ids) {
                const r = await backend.request(
                    'runHealth',
                    { report_instance_id: id },
                    session,
                    signal,
                );
                if (r.result.outcome !== 'ok') return r;
                health.push({ report_instance_id: id, health: r.health, state_name: r.state_name });
            }
            return { result: { outcome: 'ok' }, health };
        },
    };
}
