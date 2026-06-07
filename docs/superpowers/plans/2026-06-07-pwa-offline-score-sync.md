# PWA Offline Mode + Score Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let kids keep playing solo mode with no network, and have their leaderboard scores reliably reach the server once connectivity returns — without ever blocking or interrupting gameplay.

**Architecture:** Two independent layers. (1) A client-side retry queue: `submitScore` already fails silently when offline (`src/lib/leaderboardApi.ts:36`); we add a `localStorage`-backed queue that captures those failures and retries them on the `online` event / app load, with a server-side idempotency key so retried submissions can't double-count `total_sessions`. (2) A service worker (via `vite-plugin-pwa`/Workbox) that caches the app shell so the SPA loads and is playable with zero network — independent of whether scores can sync.

**Tech Stack:** React 19 + Vite 8 + TypeScript, Cloudflare Worker + D1 (existing leaderboard backend), `vite-plugin-pwa` (Workbox-based service worker), Vitest for tests.

---

## File structure

- `migrations/0005_add_processed_submissions.sql` — new table to dedupe retried submissions
- `worker/index.ts` (modify `handleSubmit`) — require + check an `idempotencyKey`, skip reprocessing duplicates
- `src/lib/leaderboardApi.ts` (modify) — add `idempotencyKey` to `ScoreSubmission`
- `src/lib/leaderboardApi.test.ts` (modify) — update the `submission` fixture to include `idempotencyKey`
- `src/lib/scoreQueue.ts` (new) — `localStorage`-backed pending-score queue (load/enqueue/remove), mirrors the pattern in `src/lib/soloStorage.ts`
- `src/lib/scoreQueue.test.ts` (new)
- `src/lib/scoreSync.ts` (new) — `submitOrQueueScore`, `flushPendingScores`, `registerScoreSync` (wires retry to the `online` event)
- `src/lib/scoreSync.test.ts` (new)
- `src/components/SoloGame.tsx` (modify) — generate a per-session idempotency key, call `submitOrQueueScore` instead of `submitScore`
- `src/App.tsx` (modify) — call `registerScoreSync()` once on mount so queued scores flush in the background regardless of which screen is active
- `vite.config.ts` (modify) — add the `VitePWA` plugin (Workbox service worker + manifest)
- `package.json` (modify) — add `vite-plugin-pwa` devDependency

---

### Task 1: Server-side idempotency for retried submissions

**Why first:** the queue is useless if a retried submission can corrupt `total_sessions` by double-incrementing it. Fix the server contract before any client code depends on it.

**Files:**
- Create: `migrations/0005_add_processed_submissions.sql`
- Modify: `worker/index.ts:6-17` (interface), `worker/index.ts:79-117` (`handleSubmit`)

- [ ] **Step 1: Write the migration**

```sql
-- Tracks which score submissions have already been applied to `scores`, so
-- a retried/queued offline submission (same idempotency key) can be safely
-- re-sent without double-incrementing total_sessions.
CREATE TABLE processed_submissions (
  idempotency_key TEXT PRIMARY KEY,
  created_at TEXT NOT NULL
);
```

- [ ] **Step 2: Apply the migration locally**

Run: `npx wrangler d1 migrations apply fracciones-leaderboard --local`
Expected: output lists `0005_add_processed_submissions.sql` as applied.

- [ ] **Step 3: Add `idempotencyKey` to the request body type and a reader for it**

In `worker/index.ts`, add `idempotencyKey?: unknown` to the `SubmitBody` interface (next to `ownerToken?: unknown` at line ~7), and add a reader near `readToken` (around line 35):

```ts
function readIdempotencyKey(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, 80) : ''
}
```

- [ ] **Step 4: Make `handleSubmit` require the key, short-circuit duplicates, and record new ones**

Replace the body of `handleSubmit` (currently `worker/index.ts:79-117`) with:

```ts
async function handleSubmit(request: Request, db: D1Database): Promise<Response> {
  let body: SubmitBody
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400)
  }

  const name = readName(body.name)
  if (!name) return jsonResponse({ error: 'invalid_name' }, 400)

  const idempotencyKey = readIdempotencyKey(body.idempotencyKey)
  if (!idempotencyKey) return jsonResponse({ error: 'invalid_idempotency_key' }, 400)

  const ownerToken = readToken(body.ownerToken)
  const owner = await findOwner(db, name)
  if (owner !== null && owner !== ownerToken) {
    return jsonResponse({ error: 'name_taken' }, 409)
  }

  const alreadyProcessed = await db
    .prepare(`SELECT 1 FROM processed_submissions WHERE idempotency_key = ?1`)
    .bind(idempotencyKey)
    .first()
  if (alreadyProcessed) return jsonResponse({ ok: true, duplicate: true })

  const questionLimit = readQuestionLimit(body.questionLimit)
  const streak = clampInt(body.streak, 0, 100000)
  const total = clampInt(body.total, 0, 100000)
  const accuracy = total >= MIN_ATTEMPTS_FOR_ACCURACY ? clampInt(body.accuracy, 0, 100) : 0
  const score = clampInt(body.score, 0, 10000000)
  const updatedAt = new Date().toISOString()

  await db.batch([
    db
      .prepare(
        `INSERT INTO players (name, owner_token, created_at)
         VALUES (?1, ?2, ?3)
         ON CONFLICT(name) DO UPDATE SET owner_token = ?2`
      )
      .bind(name, ownerToken, updatedAt),
    db
      .prepare(
        `INSERT INTO scores (name, question_limit, best_streak, best_accuracy, best_score, total_sessions, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6)
         ON CONFLICT(name, question_limit) DO UPDATE SET
           best_streak = MAX(best_streak, ?3),
           best_accuracy = MAX(best_accuracy, ?4),
           best_score = MAX(best_score, ?5),
           total_sessions = total_sessions + 1,
           updated_at = ?6`
      )
      .bind(name, questionLimit, streak, accuracy, score, updatedAt),
    db
      .prepare(`INSERT INTO processed_submissions (idempotency_key, created_at) VALUES (?1, ?2)`)
      .bind(idempotencyKey, updatedAt),
  ])

  return jsonResponse({ ok: true })
}
```

- [ ] **Step 5: Commit**

```bash
git add migrations/0005_add_processed_submissions.sql worker/index.ts
git commit -m "feat: dedupe retried score submissions via idempotency key"
```

---

### Task 2: Add `idempotencyKey` to the client submission type

**Files:**
- Modify: `src/lib/leaderboardApi.ts:4-11` (`ScoreSubmission` interface)
- Modify: `src/lib/leaderboardApi.test.ts:48` (`submission` fixture)

- [ ] **Step 1: Update the failing test fixture first**

In `src/lib/leaderboardApi.test.ts`, change line 48 from:

```ts
  const submission = { name: 'Ana', questionLimit: 20, streak: 5, accuracy: 80, score: 140, total: 12 }
```

to:

```ts
  const submission = { name: 'Ana', questionLimit: 20, streak: 5, accuracy: 80, score: 140, total: 12, idempotencyKey: 'session-abc' }
```

- [ ] **Step 2: Run the test to confirm it now fails on the type**

Run: `pnpm exec vitest run src/lib/leaderboardApi.test.ts`
Expected: FAIL — TypeScript error, "Object literal may only specify known properties... 'idempotencyKey' does not exist in type 'ScoreSubmission'".

- [ ] **Step 3: Add the field to the interface**

In `src/lib/leaderboardApi.ts`, change:

```ts
export interface ScoreSubmission {
  name: string
  questionLimit: number
  streak: number
  accuracy: number
  score: number
  total: number
}
```

to:

```ts
export interface ScoreSubmission {
  name: string
  questionLimit: number
  streak: number
  accuracy: number
  score: number
  total: number
  // Stable per-session identifier — lets the server ignore a retried/queued
  // submission instead of double-counting it (see worker/index.ts handleSubmit).
  idempotencyKey: string
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `pnpm exec vitest run src/lib/leaderboardApi.test.ts`
Expected: PASS — all `submitScore`/`checkName`/`fetchTop` tests green, including the `toEqual({ ...submission, ownerToken: 'device-123' })` assertion (it now includes `idempotencyKey`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/leaderboardApi.ts src/lib/leaderboardApi.test.ts
git commit -m "feat: require an idempotency key on score submissions"
```

---

### Task 3: Pending-score queue (`localStorage`)

**Files:**
- Create: `src/lib/scoreQueue.ts`
- Create: `src/lib/scoreQueue.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { loadPendingScores, enqueuePendingScore, removePendingScore } from './scoreQueue'

const submission = (idempotencyKey: string) => ({
  name: 'Ana', questionLimit: 20, streak: 5, accuracy: 80, score: 140, total: 12, idempotencyKey,
})

beforeEach(() => {
  localStorage.clear()
})

describe('loadPendingScores', () => {
  it('returns an empty queue when nothing is stored', () => {
    expect(loadPendingScores()).toEqual([])
  })

  it('returns an empty queue when stored data is malformed', () => {
    localStorage.setItem('fracciones:pendingScores', '{"not":"an array"}')
    expect(loadPendingScores()).toEqual([])
  })

  it('returns an empty queue when stored JSON is corrupt', () => {
    localStorage.setItem('fracciones:pendingScores', 'not json{{{')
    expect(loadPendingScores()).toEqual([])
  })

  it('drops entries that are missing required fields', () => {
    localStorage.setItem('fracciones:pendingScores', JSON.stringify([{ name: 'Ana' }, submission('valid-1')]))
    expect(loadPendingScores()).toEqual([submission('valid-1')])
  })
})

describe('enqueuePendingScore', () => {
  it('adds a submission and persists it', () => {
    enqueuePendingScore(submission('a'))
    expect(loadPendingScores()).toEqual([submission('a')])
  })

  it('replaces an existing entry with the same idempotency key instead of duplicating it', () => {
    enqueuePendingScore(submission('a'))
    enqueuePendingScore({ ...submission('a'), streak: 9 })
    const queue = loadPendingScores()
    expect(queue).toHaveLength(1)
    expect(queue[0].streak).toBe(9)
  })

  it('caps the queue at the most recent 20 entries', () => {
    for (let i = 0; i < 25; i++) enqueuePendingScore(submission(`key-${i}`))
    const queue = loadPendingScores()
    expect(queue).toHaveLength(20)
    expect(queue[0].idempotencyKey).toBe('key-5')
    expect(queue[19].idempotencyKey).toBe('key-24')
  })
})

describe('removePendingScore', () => {
  it('removes only the matching entry', () => {
    enqueuePendingScore(submission('a'))
    enqueuePendingScore(submission('b'))
    removePendingScore('a')
    expect(loadPendingScores()).toEqual([submission('b')])
  })

  it('does nothing when the key is not present', () => {
    enqueuePendingScore(submission('a'))
    removePendingScore('missing')
    expect(loadPendingScores()).toEqual([submission('a')])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/lib/scoreQueue.test.ts`
Expected: FAIL with "Failed to resolve import './scoreQueue'" (module doesn't exist yet).

- [ ] **Step 3: Implement the queue**

```ts
import type { ScoreSubmission } from './leaderboardApi'

const KEY = 'fracciones:pendingScores'
const MAX_QUEUE_SIZE = 20

function isScoreSubmission(value: unknown): value is ScoreSubmission {
  const s = value as Record<string, unknown> | null
  return (
    !!s &&
    typeof s.idempotencyKey === 'string' &&
    typeof s.name === 'string' &&
    typeof s.questionLimit === 'number' &&
    typeof s.streak === 'number' &&
    typeof s.accuracy === 'number' &&
    typeof s.score === 'number' &&
    typeof s.total === 'number'
  )
}

export function loadPendingScores(): ScoreSubmission[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isScoreSubmission) : []
  } catch {
    return []
  }
}

function persist(queue: ScoreSubmission[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(queue))
  } catch {
    // localStorage unavailable (private browsing / quota) — the score is
    // lost, but that must never block gameplay.
  }
}

// Queues a submission that failed to send so flushPendingScores can retry it
// once back online. Re-enqueuing the same session (same idempotencyKey)
// replaces the stale entry rather than duplicating it. Capped to the most
// recent MAX_QUEUE_SIZE — an offline kid playing for hours shouldn't grow
// this without bound.
export function enqueuePendingScore(submission: ScoreSubmission): void {
  const queue = loadPendingScores().filter(s => s.idempotencyKey !== submission.idempotencyKey)
  queue.push(submission)
  persist(queue.slice(-MAX_QUEUE_SIZE))
}

export function removePendingScore(idempotencyKey: string): void {
  persist(loadPendingScores().filter(s => s.idempotencyKey !== idempotencyKey))
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run src/lib/scoreQueue.test.ts`
Expected: PASS — all `loadPendingScores`/`enqueuePendingScore`/`removePendingScore` tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/scoreQueue.ts src/lib/scoreQueue.test.ts
git commit -m "feat: add localStorage-backed pending score queue"
```

---

### Task 4: Sync orchestration (`submitOrQueueScore`, `flushPendingScores`, `registerScoreSync`)

**Files:**
- Create: `src/lib/scoreSync.ts`
- Create: `src/lib/scoreSync.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { submitOrQueueScore, flushPendingScores, registerScoreSync } from './scoreSync'
import { loadPendingScores, enqueuePendingScore } from './scoreQueue'
import { submitScore } from './leaderboardApi'

vi.mock('./leaderboardApi', () => ({ submitScore: vi.fn() }))

const submission = (idempotencyKey: string) => ({
  name: 'Ana', questionLimit: 20, streak: 5, accuracy: 80, score: 140, total: 12, idempotencyKey,
})

beforeEach(() => {
  localStorage.clear()
  vi.mocked(submitScore).mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('submitOrQueueScore', () => {
  it('does not queue the submission when it sends successfully', async () => {
    vi.mocked(submitScore).mockResolvedValue(true)
    await submitOrQueueScore(submission('a'))
    expect(loadPendingScores()).toEqual([])
  })

  it('queues the submission when sending fails', async () => {
    vi.mocked(submitScore).mockResolvedValue(false)
    await submitOrQueueScore(submission('a'))
    expect(loadPendingScores()).toEqual([submission('a')])
  })
})

describe('flushPendingScores', () => {
  it('removes queued entries that now send successfully', async () => {
    enqueuePendingScore(submission('a'))
    enqueuePendingScore(submission('b'))
    vi.mocked(submitScore).mockResolvedValue(true)
    await flushPendingScores()
    expect(loadPendingScores()).toEqual([])
    expect(submitScore).toHaveBeenCalledTimes(2)
  })

  it('keeps entries that still fail to send', async () => {
    enqueuePendingScore(submission('a'))
    enqueuePendingScore(submission('b'))
    vi.mocked(submitScore).mockImplementation(async (s) => s.idempotencyKey === 'a')
    await flushPendingScores()
    expect(loadPendingScores()).toEqual([submission('b')])
  })
})

describe('registerScoreSync', () => {
  it('flushes immediately and again on the "online" event, and unregisters via the returned cleanup', async () => {
    enqueuePendingScore(submission('a'))
    vi.mocked(submitScore).mockResolvedValue(true)

    const unregister = registerScoreSync()
    await Promise.resolve()
    expect(submitScore).toHaveBeenCalledTimes(1)

    enqueuePendingScore(submission('b'))
    window.dispatchEvent(new Event('online'))
    await Promise.resolve()
    expect(submitScore).toHaveBeenCalledTimes(2)

    unregister()
    enqueuePendingScore(submission('c'))
    window.dispatchEvent(new Event('online'))
    await Promise.resolve()
    expect(submitScore).toHaveBeenCalledTimes(2)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/lib/scoreSync.test.ts`
Expected: FAIL with "Failed to resolve import './scoreSync'" (module doesn't exist yet).

- [ ] **Step 3: Implement the sync module**

```ts
import type { ScoreSubmission } from './leaderboardApi'
import { submitScore } from './leaderboardApi'
import { enqueuePendingScore, loadPendingScores, removePendingScore } from './scoreQueue'

// Tries to submit immediately; if that fails (offline/server error), queues
// the score so flushPendingScores can retry it once connectivity returns.
// Never throws — the leaderboard is a bonus, not a blocker for exiting.
export async function submitOrQueueScore(submission: ScoreSubmission): Promise<void> {
  const ok = await submitScore(submission)
  if (!ok) enqueuePendingScore(submission)
}

// Retries every queued score; each success is removed from the queue.
// Safe to call repeatedly — the idempotency key lets the server ignore
// duplicates, so re-flushing an already-sent entry is harmless.
export async function flushPendingScores(): Promise<void> {
  for (const submission of loadPendingScores()) {
    if (await submitScore(submission)) removePendingScore(submission.idempotencyKey)
  }
}

// Wires up automatic retry: once immediately (covers "app reopened while
// online with stale queue entries") and again whenever the browser regains
// connectivity. Returns a cleanup function that removes the listener.
export function registerScoreSync(): () => void {
  void flushPendingScores()
  const handleOnline = () => { void flushPendingScores() }
  window.addEventListener('online', handleOnline)
  return () => window.removeEventListener('online', handleOnline)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run src/lib/scoreSync.test.ts`
Expected: PASS — all `submitOrQueueScore`/`flushPendingScores`/`registerScoreSync` tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/scoreSync.ts src/lib/scoreSync.test.ts
git commit -m "feat: retry failed score submissions on reconnect"
```

---

### Task 5: Wire the sync into the app

**Files:**
- Modify: `src/components/SoloGame.tsx:194-206`
- Modify: `src/App.tsx`
- Modify (if present): `src/components/SoloGame.test.tsx` — add a regression test for the idempotency key

- [ ] **Step 1: Read the current SoloGame submission test(s) for context**

Run: `grep -n "submitScore\|leaderboardApi" src/components/SoloGame.test.tsx`
This shows you the existing mock setup for `submitScore` so the new assertion matches the established mocking style.

- [ ] **Step 2: Add a failing assertion that the submission carries a stable idempotency key**

In `src/components/SoloGame.test.tsx`, find the test that asserts `submitScore`/`submitOrQueueScore` is called when the summary is shown (search for `toHaveBeenCalledWith`). Extend that assertion's expected object to include:

```ts
        idempotencyKey: expect.any(String),
```

If the suite triggers the end-of-session effect twice (e.g. a re-render check), add:

```ts
      // The same session must always produce the same key — otherwise a
      // retried submission would be treated as a brand new one server-side.
      const [firstCall] = vi.mocked(submitOrQueueScore).mock.calls
      const [secondCall] = vi.mocked(submitOrQueueScore).mock.calls.slice(-1)
      expect(firstCall[0].idempotencyKey).toBe(secondCall[0].idempotencyKey)
```

(Adapt the mock import name from `submitScore` to `submitOrQueueScore` per Step 3 below — keep the rest of the existing mock factory shape.)

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm exec vitest run src/components/SoloGame.test.tsx`
Expected: FAIL — either "submitOrQueueScore is not a function" (mock not updated yet) or the `idempotencyKey` assertion failing because `SoloGame` still calls `submitScore` without one.

- [ ] **Step 4: Generate a per-session id and switch to `submitOrQueueScore`**

In `src/components/SoloGame.tsx`:

1. Change the import on line 8 from:

```ts
import { submitScore } from '../lib/leaderboardApi'
```

to:

```ts
import { submitOrQueueScore } from '../lib/scoreSync'
```

2. Add a ref alongside `sessionPersistedRef` (line 194):

```ts
  const sessionPersistedRef = useRef(false)
  // One id per played session — stable across re-renders and reused if the
  // submission has to be queued and retried later (see scoreSync.ts).
  const sessionIdRef = useRef(crypto.randomUUID())
```

3. Replace the `submitScore` call on line 205:

```ts
    submitScore({ name: config.player1Name || 'Jugador', questionLimit: config.questionLimit, streak: bestStreak, accuracy, score: points, total: totalCount })
```

with:

```ts
    submitOrQueueScore({ name: config.player1Name || 'Jugador', questionLimit: config.questionLimit, streak: bestStreak, accuracy, score: points, total: totalCount, idempotencyKey: sessionIdRef.current })
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm exec vitest run src/components/SoloGame.test.tsx`
Expected: PASS.

- [ ] **Step 6: Register the background sync once at app startup**

In `src/App.tsx`, add the import:

```ts
import { useEffect, useState } from 'react'
import { registerScoreSync } from './lib/scoreSync'
```

(merge with the existing `import { useState } from 'react'` — just add `useEffect` to that named import list)

Then, inside `export default function App()`, right after the `useState` declarations, add:

```ts
  // Retries any score that failed to reach the server (offline/error) as
  // soon as the app loads and again whenever connectivity returns — runs
  // for the lifetime of the app regardless of which screen is showing.
  useEffect(() => registerScoreSync(), [])
```

- [ ] **Step 7: Run the full test suite**

Run: `pnpm exec vitest run`
Expected: PASS — no regressions in `App`, `SoloGame`, `Leaderboard`, `leaderboardApi`, `scoreQueue`, `scoreSync`.

- [ ] **Step 8: Commit**

```bash
git add src/components/SoloGame.tsx src/components/SoloGame.test.tsx src/App.tsx
git commit -m "feat: queue and retry score submissions when offline"
```

---

### Task 6: Offline app shell via `vite-plugin-pwa`

**Files:**
- Modify: `package.json` (devDependency)
- Modify: `vite.config.ts`
- Modify: `index.html` (theme-color meta + manifest link is auto-injected by the plugin, but we add `theme-color` explicitly for iOS/Android browser chrome)

- [ ] **Step 1: Install the plugin**

Run: `pnpm add -D vite-plugin-pwa`
Expected: `package.json` gains `"vite-plugin-pwa": "^<version>"` under `devDependencies`, lockfile updated.

- [ ] **Step 2: Configure the plugin in `vite.config.ts`**

Replace the file's contents with:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  // The Cloudflare plugin configures a Worker environment (nodejs_compat
  // resolve.external) that conflicts with Vitest's pool, and the PWA plugin
  // has nothing to do during tests — both are skipped under Vitest.
  plugins: [
    react(),
    ...(process.env.VITEST
      ? []
      : [
          cloudflare(),
          VitePWA({
            registerType: 'autoUpdate',
            // Precache the SPA shell so it loads with no network at all;
            // the leaderboard API calls stay network-only (handled by the
            // existing checkName/submitScore/fetchTop fallbacks) — caching
            // stale leaderboard data would be more confusing than useful
            // for a kid checking "did I make the top 10?".
            workbox: {
              globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
              navigateFallbackDenylist: [/^\/api\//],
            },
            manifest: {
              name: 'Fracciones VS',
              short_name: 'Fracciones',
              description: 'Duelo de fracciones a dos jugadores: responde rápido, gana puntos y derrota a tu rival.',
              start_url: '/',
              display: 'standalone',
              background_color: '#0f172a',
              theme_color: '#0f172a',
              icons: [
                { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
                { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
              ],
            },
          }),
        ]),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
  },
})
```

- [ ] **Step 3: Add `theme-color` to `index.html`**

In `index.html`, add this line right after the `<meta name="viewport" ...>` line:

```html
    <meta name="theme-color" content="#0f172a" />
```

- [ ] **Step 4: Build and verify the service worker is generated**

Run: `pnpm run build`
Expected: build succeeds; output includes `dist/sw.js` and `dist/manifest.webmanifest` (look for "PWA v..." in the build log and confirm the files exist with `ls dist/sw.js dist/manifest.webmanifest`).

- [ ] **Step 5: Manually verify offline play in the browser**

Run: `pnpm run preview` (this runs `wrangler dev` against the production build per the existing `preview` script)

Then in Chrome DevTools:
1. Open the served URL, open DevTools → Application → Service Workers, confirm a worker is "activated and running".
2. Application → Network conditions (or the Network tab throttling dropdown) → set to "Offline".
3. Reload the page — the app shell (Home screen) should still load and be playable.
4. Start a solo game and finish a round — gameplay must work fully offline; the leaderboard panel may show no data (expected — `fetchTop` returns `null` offline) but must not crash or block the summary screen.
5. Switch back to "Online", reload — confirm `flushPendingScores` fires (Network tab shows a `POST /api/leaderboard/submit` for the queued session) and `localStorage['fracciones:pendingScores']` becomes `[]`.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml vite.config.ts index.html
git commit -m "feat: add offline-capable app shell via service worker (PWA)"
```

---

## Notes for the implementer

- Tasks 1–5 are the "score sync" half and are independently testable/shippable without Task 6.
- Task 6 (PWA shell) is independently shippable without Tasks 1–5 — if you want to ship offline play first and sync later, do Task 6 right after Task 1 is skipped... but note Task 6 has no dependency on 1–5 at all, so it can run in parallel with them if using subagent-driven development.
- Do not cache `/api/leaderboard/*` responses in the service worker — `navigateFallbackDenylist` plus the `NetworkFirst`-free config above keeps them network-only, matching the existing "leaderboard is a nice-to-have, never block on it" philosophy already encoded in `leaderboardApi.ts`.
