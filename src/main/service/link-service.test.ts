import { describe, it, expect, beforeEach } from 'vitest'
import { LinkService } from './link-service'
import { setDataStore } from '../utils'
import type { DataStore } from '../store'

function makeMemStore(init: Record<string, unknown> = {}): DataStore {
    const data = new Map<string, unknown>(Object.entries(init))
    return {
        readJSON<T>(filename: string, fallback: T): T {
            return (data.has(filename) ? data.get(filename) : fallback) as T
        },
        writeJSON(filename: string, value: unknown): void {
            data.set(filename, value)
        },
    } as DataStore
}

describe('LinkService.addSources', () => {
    let svc: LinkService

    beforeEach(() => {
        setDataStore(makeMemStore({ 'links.json': { version: '1', links: [] } }))
        svc = new LinkService()
    })

    it('creates a new link when unifiedId does not exist', () => {
        const r = svc.addSources('MyQueue', 'My Queue', [
            { arn: 'arn:aws:sqs:us-east-1:111:q', envId: 'prod', included: true },
        ])
        expect(r.created).toBe(true)
        expect(r.added).toBe(1)
        const links = svc.list()
        expect(links).toHaveLength(1)
        expect(links[0].unifiedId).toBe('MyQueue')
        expect(links[0].sources).toHaveLength(1)
    })

    it('appends new sources to an existing link', () => {
        svc.addSources('MyQueue', 'My Queue', [
            { arn: 'arn:aws:sqs:us-east-1:111:q', envId: 'prod', included: true },
        ])
        const r = svc.addSources('MyQueue', 'My Queue', [
            { arn: 'arn:aws:sqs:us-east-1:222:q', envId: 'staging', included: false },
        ])
        expect(r.created).toBe(false)
        expect(r.added).toBe(1)
        expect(svc.list()[0].sources).toHaveLength(2)
    })

    it('does not duplicate an ARN already in the link', () => {
        svc.addSources('MyQueue', 'My Queue', [
            { arn: 'arn:aws:sqs:us-east-1:111:q', envId: 'prod', included: true },
        ])
        const r = svc.addSources('MyQueue', 'My Queue', [
            { arn: 'arn:aws:sqs:us-east-1:111:q', envId: 'prod', included: true },
        ])
        expect(r.added).toBe(0)
        expect(r.deduped).toBe(1)
        expect(svc.list()[0].sources).toHaveLength(1)
    })

    it('does not duplicate when source and target ARN are the same (the link add bug)', () => {
        const sameArn = 'arn:aws:sqs:us-east-1:111:q'
        const r = svc.addSources('MyQueue', 'My Queue', [
            { arn: sameArn, envId: 'prod', included: true },
            { arn: sameArn, envId: 'prod', included: false },
        ])
        expect(r.created).toBe(true)
        expect(r.added).toBe(1)
        expect(r.deduped).toBe(1)
        expect(svc.list()[0].sources).toHaveLength(1)
        // First occurrence wins (included: true)
        expect(svc.list()[0].sources[0].included).toBe(true)
    })

    it('updates label when adding to an existing link', () => {
        svc.addSources('MyQueue', 'Old Label', [
            { arn: 'arn:aws:sqs:us-east-1:111:q', envId: 'prod', included: true },
        ])
        svc.addSources('MyQueue', 'New Label', [
            { arn: 'arn:aws:sqs:us-east-1:222:q', envId: 'staging', included: false },
        ])
        expect(svc.list()[0].label).toBe('New Label')
    })

    it('preserves existing label when called without one', () => {
        svc.addSources('MyQueue', 'Original', [
            { arn: 'arn:aws:sqs:us-east-1:111:q', envId: 'prod', included: true },
        ])
        svc.addSources('MyQueue', undefined, [
            { arn: 'arn:aws:sqs:us-east-1:222:q', envId: 'staging', included: false },
        ])
        expect(svc.list()[0].label).toBe('Original')
    })
})
