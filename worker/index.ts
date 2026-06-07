const MAX_NAME_LENGTH = 12
const MIN_ATTEMPTS_FOR_ACCURACY = 10
const DEFAULT_TOP_LIMIT = 10
const MAX_TOP_LIMIT = 50
const QUESTION_LIMITS = [10, 20, 30, 50]
const TIMER_SECONDS_OPTIONS = [0, 10, 15, 20, 30, 60]

interface SubmitBody {
  name?: unknown
  ownerToken?: unknown
  idempotencyKey?: unknown
  questionLimit?: unknown
  timerSeconds?: unknown
  streak?: unknown
  accuracy?: unknown
  score?: unknown
  total?: unknown
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function clampInt(value: unknown, min: number, max: number): number {
  const n = Math.trunc(Number(value))
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, n))
}

function readName(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, MAX_NAME_LENGTH) : ''
}

function readToken(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, 64) : ''
}

function readIdempotencyKey(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, 80) : ''
}

// Question-limit configs are a fixed, known set (matches the Home screen
// selector) — snap anything else to the closest one rather than accepting
// arbitrary values that would fragment the leaderboard.
function readQuestionLimit(value: unknown): number {
  const n = Math.trunc(Number(value))
  if (!Number.isFinite(n)) return QUESTION_LIMITS[0]
  return QUESTION_LIMITS.reduce((closest, candidate) =>
    Math.abs(candidate - n) < Math.abs(closest - n) ? candidate : closest
  )
}

// Same snap-to-known-set treatment as readQuestionLimit — the timer is one
// of a fixed set of Home-screen options (including 0 for "no limit").
function readTimerSeconds(value: unknown): number {
  const n = Math.trunc(Number(value))
  if (!Number.isFinite(n)) return TIMER_SECONDS_OPTIONS[TIMER_SECONDS_OPTIONS.length - 1]
  return TIMER_SECONDS_OPTIONS.reduce((closest, candidate) =>
    Math.abs(candidate - n) < Math.abs(closest - n) ? candidate : closest
  )
}

// Looks up the current owner of `name`. Returns null if the name is unclaimed.
async function findOwner(db: D1Database, name: string): Promise<string | null> {
  const row = await db.prepare(`SELECT owner_token AS ownerToken FROM players WHERE name = ?1`).bind(name).first<{ ownerToken: string | null }>()
  return row ? row.ownerToken : null
}

async function handleCheck(request: Request, db: D1Database): Promise<Response> {
  const url = new URL(request.url)
  const name = readName(url.searchParams.get('name'))
  const token = readToken(url.searchParams.get('token'))
  if (!name) return jsonResponse({ error: 'invalid_name' }, 400)

  const owner = await findOwner(db, name)
  const available = owner === null || owner === token
  return jsonResponse({ available })
}

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
  const timerSeconds = readTimerSeconds(body.timerSeconds)
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
        `INSERT INTO scores (name, question_limit, best_streak, best_accuracy, best_score, best_timer_seconds, total_sessions, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?7, 1, ?6)
         ON CONFLICT(name, question_limit) DO UPDATE SET
           best_streak = MAX(best_streak, ?3),
           best_accuracy = MAX(best_accuracy, ?4),
           best_score = MAX(best_score, ?5),
           best_timer_seconds = CASE WHEN ?5 > best_score THEN ?7 ELSE best_timer_seconds END,
           total_sessions = total_sessions + 1,
           updated_at = ?6`
      )
      .bind(name, questionLimit, streak, accuracy, score, updatedAt, timerSeconds),
    db
      .prepare(`INSERT INTO processed_submissions (idempotency_key, created_at) VALUES (?1, ?2)`)
      .bind(idempotencyKey, updatedAt),
  ])

  return jsonResponse({ ok: true })
}

async function handleTop(request: Request, db: D1Database): Promise<Response> {
  const url = new URL(request.url)
  const limit = clampInt(url.searchParams.get('limit') ?? DEFAULT_TOP_LIMIT, 1, MAX_TOP_LIMIT)
  const questionLimit = readQuestionLimit(url.searchParams.get('questionLimit'))

  const { results } = await db
    .prepare(
      `SELECT name, best_streak AS bestStreak, best_accuracy AS bestAccuracy, best_score AS bestScore, best_timer_seconds AS bestTimerSeconds, total_sessions AS totalSessions
       FROM scores
       WHERE question_limit = ?1
       ORDER BY best_score DESC, best_streak DESC
       LIMIT ?2`
    )
    .bind(questionLimit, limit)
    .all()

  return jsonResponse({ entries: results ?? [] })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/api/leaderboard/check' && request.method === 'GET') {
      return handleCheck(request, env.DB)
    }
    if (url.pathname === '/api/leaderboard/submit' && request.method === 'POST') {
      return handleSubmit(request, env.DB)
    }
    if (url.pathname === '/api/leaderboard/top' && request.method === 'GET') {
      return handleTop(request, env.DB)
    }
    if (url.pathname.startsWith('/api/')) {
      return jsonResponse({ error: 'not_found' }, 404)
    }

    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>
