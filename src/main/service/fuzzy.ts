/**
 * String similarity in [0,1]. Combines two heuristics:
 *
 *   - Levenshtein ratio: 1 - editDistance / max(len(a), len(b)). Strong for
 *     typos, small insertions/deletions, common prefixes/suffixes.
 *   - Sørensen-Dice on whitespace tokens: 2 * |A∩B| / (|A| + |B|). Strong for
 *     word reordering and shared keywords inside longer phrases.
 *
 * Final score is the max of the two so a match by either lane counts.
 */

function levenshtein(a: string, b: string): number {
    if (a === b) return 0
    const m = a.length
    const n = b.length
    if (m === 0) return n
    if (n === 0) return m
    let prev = new Array<number>(n + 1)
    let curr = new Array<number>(n + 1)
    for (let j = 0; j <= n; j++) prev[j] = j
    for (let i = 1; i <= m; i++) {
        curr[0] = i
        for (let j = 1; j <= n; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1
            curr[j] = Math.min(
                curr[j - 1] + 1,       // insertion
                prev[j] + 1,           // deletion
                prev[j - 1] + cost     // substitution
            )
        }
        const tmp = prev
        prev = curr
        curr = tmp
    }
    return prev[n]
}

function tokens(s: string): string[] {
    return s.split(/\s+/).filter(Boolean)
}

export function fuzzyScore(a: string, b: string): number {
    if (a === b) return 1
    if (!a || !b) return 0

    const maxLen = Math.max(a.length, b.length)
    const levRatio = maxLen === 0 ? 0 : 1 - levenshtein(a, b) / maxLen

    const ta = tokens(a)
    const tb = tokens(b)
    let dice = 0
    if (ta.length > 0 && tb.length > 0) {
        const setB = new Set(tb)
        let common = 0
        for (const t of ta) if (setB.has(t)) common++
        dice = (2 * common) / (ta.length + tb.length)
    }

    return Math.max(levRatio, dice)
}
