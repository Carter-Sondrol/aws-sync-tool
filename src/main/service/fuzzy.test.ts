import { describe, it, expect } from 'vitest'
import { fuzzyScore } from './fuzzy'

describe('fuzzyScore', () => {
    it('returns 1 for identical strings', () => {
        expect(fuzzyScore('abc', 'abc')).toBe(1)
    })

    it('returns 0 when either side is empty', () => {
        expect(fuzzyScore('', 'abc')).toBe(0)
        expect(fuzzyScore('abc', '')).toBe(0)
    })

    it('catches insertion: "tra" vs "tra new" via dice (≥ 0.6)', () => {
        // tokens: {"tra"} ∩ {"tra","new"} = 1 → 2*1/(1+2) ≈ 0.67
        expect(fuzzyScore('tra', 'tra new')).toBeGreaterThanOrEqual(0.6)
    })

    it('catches mid-string insertion via Levenshtein ratio', () => {
        // "sales tax clearance" vs "sales tax crdh clearance" — naive position
        // scoring would drop after pos 9; Levenshtein/dice both stay high
        expect(fuzzyScore('sales tax clearance', 'sales tax crdh clearance')).toBeGreaterThanOrEqual(0.6)
    })

    it('handles word reordering via Sørensen-Dice', () => {
        // tokens overlap fully — dice = 2*2/(2+2) = 1
        expect(fuzzyScore('alpha beta', 'beta alpha')).toBe(1)
    })

    it('rejects unrelated names', () => {
        expect(fuzzyScore('apples', 'wagon')).toBeLessThan(0.4)
    })

    it('returns sensible score for typos', () => {
        // single substitution in 5-char string → distance 1 → 1 - 1/5 = 0.8
        expect(fuzzyScore('queue', 'queye')).toBeGreaterThanOrEqual(0.7)
    })
})
