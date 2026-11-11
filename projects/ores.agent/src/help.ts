// SPDX-License-Identifier: GPL-3.0-or-later
import { z } from 'zod';
import { version } from './version.js';

const sourceRoot = 'https://github.com/OreStudio/OreStudio/blob/main/';
const sections = [
    {
        title: 'Create a book in the web app',
        topics: 'book books',
        keywords: 'add new create set up structure web browser',
        excerpt:
            'As a tenant administrator, open **Shape the book structure**. In the book tree, select the portfolio that will contain the book. Enter the book name and functional currency, complete its classification, then review the changes before confirming.',
        source: 'doc/knowledge/journeys/books/journey_shape_the_book_structure.org',
    },
    {
        title: 'Create a portfolio in the web app',
        topics: 'portfolio portfolios',
        keywords: 'add new create set up parent hierarchy tree structure web browser',
        excerpt:
            'Open **Shape the book structure** and select **New portfolio** in the tree. Enter its name, purpose and aggregation currency. Choose a parent if this is a sub-portfolio. This workflow creates the portfolio as part of adding its first book. Complete the book details and review the changes before confirming.',
        source: 'doc/knowledge/journeys/books/journey_shape_the_book_structure.org',
    },
    {
        title: 'Find and create books in the shell',
        topics: 'book books',
        keywords: 'shell cli terminal command list find get add new create',
        excerpt:
            'Use `books list` to read a page of books and `books get <name>` for an exact name. Use `books add` to create a book. The recipe lists the required arguments, including the party, parent portfolio, classification and change reason.',
        source: 'doc/recipes/shell/books/book.org',
    },
    {
        title: 'Find and create portfolios in the shell',
        topics: 'portfolio portfolios',
        keywords: 'shell cli terminal command list find get add new create',
        excerpt:
            'Use `portfolios list` to read a page of portfolios and `portfolios get <name>` for an exact name. Use `portfolios add` to create a portfolio. The recipe lists the required arguments, including the party, purpose, aggregation currency and change reason.',
        source: 'doc/recipes/shell/portfolios/portfolio.org',
    },
    {
        title: 'Sign in and choose a party in the web app',
        topics: 'sign login log signin authenticate password party',
        keywords: 'choose select web browser',
        excerpt:
            'Open **Sign in** and enter your username and password. If OreStudio asks you to choose a party, select the party you want to work in. If the party choice times out, sign in again.',
        source: 'doc/knowledge/journeys/entry/journey_sign_in.org',
    },
    {
        title: 'Run a report in the web app',
        topics: 'report reports npv',
        keywords: 'run runs start trigger execute launch now demand web browser',
        excerpt:
            'Open **Reporting** and choose the report definition. Check its scope and run configuration, select **Run now**, then confirm. OreStudio opens the new run so you can follow its status.',
        source: 'doc/knowledge/journeys/reporting/journey_run_a_report_and_watch_it_finish.org',
    },
    {
        title: 'View or download report results in the web app',
        topics: 'report reports run runs result results',
        keywords:
            'view find read see check open download export output archive status error errors npv web browser',
        excerpt:
            'Open the report run from **Reporting**. Use **Details** for the run state, **Results** for recorded results, **Errors** for problems and **Downloads** for available output files.',
        source: 'doc/knowledge/journeys/reporting/journey_read_what_a_run_produced.org',
    },
];

const stopWords = new Set(
    'a an and are can could do does for from guide help how i in is it me my of on or orestudio ore studio please should the to use using we what where with would you'.split(
        ' ',
    ),
);

function words(text: string) {
    return new Set(
        (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((word) => !stopWords.has(word)),
    );
}

const index = sections.map(({ keywords, topics, title, excerpt, source }) => ({
    title,
    excerpt,
    url: sourceRoot + source,
    topics: words(topics),
    terms: words(`${topics} ${keywords}`),
    titleTerms: words(title),
}));

export const helpTool = {
    description:
        'Search bundled OreStudio help for how-to steps, navigation or shell syntax. Use a short query with the task and interface if specified. Returns cited excerpts for this agent release.',
    schema: z.object({ query: z.string().trim().min(1).max(16000) }).strict(),
};

export function isHelpRequest(message: string) {
    return /^(?:please\s+)?(?:how\s+(?:(?:do|can|could|should|would)\s+(?:i|we)\b|to\b)|(?:show|tell|teach)\s+me\s+how\b|where\s+(?:do|can|should)\s+(?:i|we)\b|(?:find|search)\s+(?:(?:the|for)\s+)?(?:orestudio\s+)?(?:help|docs|documentation)\b|(?:help|docs|documentation|how-to)\b)/i.test(
        message.trim(),
    );
}

export function searchHelp(query: string) {
    const terms = [...words(query)];
    const hits = index
        .filter(({ topics }) => terms.some((term) => topics.has(term)))
        .map(({ title, excerpt, url, terms: indexed, titleTerms }) => {
            const coverage = terms.filter((term) => indexed.has(term)).length;
            return {
                title,
                excerpt,
                url,
                coverage,
                score: coverage + terms.filter((term) => titleTerms.has(term)).length,
            };
        })
        .filter(({ coverage }) => coverage >= Math.ceil(terms.length * 0.6))
        .sort((a, b) => b.score - a.score);
    const matches = hits
        .filter(({ score }) => score === hits[0]?.score)
        .slice(0, 3)
        .map(({ title, excerpt, url }) => ({ title, excerpt, url }));
    return {
        tool: 'search_help',
        status: matches.length ? 'ok' : 'not_found',
        version,
        matches,
    };
}

export function formatHelp(result: ReturnType<typeof searchHelp>) {
    if (!result.matches.length)
        return 'I found no matching instructions in the OreStudio help for this release.';
    return result.matches
        .map(({ title, excerpt, url }) => `**${title}**\n\n${excerpt}\n\n[Source](${url})`)
        .join('\n\n');
}
