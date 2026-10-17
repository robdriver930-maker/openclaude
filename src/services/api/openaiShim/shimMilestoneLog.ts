// Async milestone logger for the OpenAI-compatible stream path.
//
// Purpose: when a reply hangs, the LAST line in diag/shim-<date>.log is the
// stall marker — it tells us exactly which milestone was reached (request
// start / first chunk / gap / finish / error) and how long into the request.
//
// Design constraints (per plan):
//  - Milestones only, never per-chunk (no log flood).
//  - Fire-and-forget: no sync fs in the stream hot path. Each append is an
//    async queueMicrotask; a pending flush is awaited at the next milestone so
//    lines are ordered and a kill mid-stream still leaves the last line on disk.
//  - Small file per session (one per day), relative timestamps to request start.
//  - Gated by env OPENCLAUDE_SHIM_MILESTONE_LOG=1 (default ON unless "0").

import { appendFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'

function logPath(): string {
  const d = new Date()
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
  return join(process.cwd(), 'diag', `shim-${date}.log`)
}

let enabled = process.env.OPENCLAUDE_SHIM_MILESTONE_LOG !== '0'
let pending: Promise<unknown> = Promise.resolve()
let dirReady = false

function ensureDir(): Promise<void> {
  if (dirReady) return Promise.resolve()
  const p = mkdir(dirname(logPath()), { recursive: true })
    .then(() => {
      dirReady = true
    })
    .catch(() => {})
  dirReady = true
  return p
}

/** Record a milestone. `t` is ms since request start (relative). */
export function shimMilestone(t: number, label: string): void {
  if (!enabled) return
  const line = `[${new Date().toISOString()}] +${Math.round(t)}ms ${label}\n`
  pending = pending
    .then(() => ensureDir())
    .then(() => appendFile(logPath(), line, 'utf8'))
    .catch(() => {})
}

/** Await any in-flight write. Call at terminal milestones (finish/error) so a
 *  process kill cannot drop the final marker. */
export async function shimMilestoneFlush(): Promise<void> {
  if (!enabled) return
  await pending.catch(() => {})
}

export function __setShimMilestoneEnabled(v: boolean): void {
  enabled = v
}
