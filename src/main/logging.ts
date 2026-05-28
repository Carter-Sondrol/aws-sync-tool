/**
 * Lightweight structured logger.
 *
 * Outputs JSON-lines to stderr (machine-readable) in production,
 * colored prefix + message to stdout in dev mode.
 * Tagged by context (e.g. "engine", "sync", "cdk") for filtering.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_ORDER: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
}

let minLevel: LogLevel = process.env.AWSYNC_LOG_LEVEL
    ? (process.env.AWSYNC_LOG_LEVEL.toLowerCase() as LogLevel)
    : 'info'

/** Set the minimum log level. Anything below is silenced. */
export function setLevel(level: LogLevel): void {
    minLevel = level
}

function shouldLog(level: LogLevel): boolean {
    return LEVEL_ORDER[level] >= LEVEL_ORDER[minLevel]
}

interface LogEntry {
    ts: string
    lvl: LogLevel
    ctx: string
    msg: string
    err?: unknown
}

/** Format a log entry as a JSON line (for file/pipe consumption). */
function formatJson(entry: LogEntry): string {
    return JSON.stringify({
        ts: entry.ts,
        lvl: entry.lvl,
        ctx: entry.ctx,
        msg: entry.msg,
        err: entry.err ? (entry.err instanceof Error ? entry.err.message : String(entry.err)) : undefined,
    })
}

/** Format a log entry for human-readable console output. */
function formatConsole(entry: LogEntry): string {
    const prefix = `[${entry.ts.slice(11, 19)}] [${entry.lvl.toUpperCase().padEnd(5)}] [${entry.ctx}]`
    const base = `${prefix} ${entry.msg}`
    if (entry.err) {
        return `${base}\n  ↳ ${entry.err instanceof Error ? entry.err.stack ?? entry.err.message : String(entry.err)}`
    }
    return base
}

/**
 * Create a logger bound to a context tag.
 * Usage: const log = getLogger('engine'); log.info('started')
 */
export function getLogger(ctx: string) {
    const timestamp = () => new Date().toISOString()

    function log(level: LogLevel, msg: string, err?: unknown): void {
        if (!shouldLog(level)) return

        const entry: LogEntry = { ts: timestamp(), lvl: level, ctx, msg, err }

        if (process.env.AWSYNC_LOG_JSON) {
            process.stderr.write(formatJson(entry) + '\n')
        } else {
            if (level === 'error') {
                console.error(formatConsole(entry))
            } else if (level === 'warn') {
                console.warn(formatConsole(entry))
            } else {
                console.log(formatConsole(entry))
            }
        }
    }

    return {
        debug: (msg: string, err?: unknown) => log('debug', msg, err),
        info: (msg: string, err?: unknown) => log('info', msg, err),
        warn: (msg: string, err?: unknown) => log('warn', msg, err),
        error: (msg: string, err?: unknown) => log('error', msg, err),
    }
}
