import { Hono } from 'hono';
import { cors } from "hono/cors";
import { db } from './database';
import { moodLogs, sessions, streaks } from './database/schema';
import { eq, desc, gte, sql } from 'drizzle-orm';
import { auth } from './auth';

const app = new Hono()
  .use(cors({ origin: (origin) => origin ?? "*", credentials: true, exposeHeaders: ["set-auth-token"] }))
  .on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw))
  .basePath('api')
  .get('/ping', (c) => c.json({ message: `Pong! ${Date.now()}` }, 200))
  .get('/health', (c) => c.json({ status: 'ok' }, 200))

  // ── Mood Logs ──────────────────────────────────────────
  .get('/mood', async (c) => {
    const logs = await db.select().from(moodLogs).orderBy(desc(moodLogs.date)).limit(30);
    return c.json(logs, 200);
  })
  .post('/mood', async (c) => {
    const body = await c.req.json<{ date: string; mood: number; note?: string }>();
    const today = body.date;
    // upsert: delete existing then insert
    await db.delete(moodLogs).where(eq(moodLogs.date, today));
    const [log] = await db.insert(moodLogs).values({
      date: today,
      mood: body.mood,
      note: body.note ?? null,
    }).returning();
    // update streak
    await upsertStreak(today);
    return c.json(log, 200);
  })

  // ── Sessions ───────────────────────────────────────────
  .get('/sessions', async (c) => {
    const list = await db.select().from(sessions).orderBy(desc(sessions.completedAt)).limit(50);
    return c.json(list, 200);
  })
  .post('/sessions', async (c) => {
    const body = await c.req.json<{ type: string; exercise?: string; duration: number; date: string }>();
    const [session] = await db.insert(sessions).values({
      type: body.type,
      exercise: body.exercise ?? null,
      duration: body.duration,
      date: body.date,
    }).returning();
    await upsertStreak(body.date);
    return c.json(session, 200);
  })

  // ── Streaks ────────────────────────────────────────────
  .get('/streaks', async (c) => {
    const all = await db.select().from(streaks).orderBy(desc(streaks.date)).limit(60);
    // compute current streak
    let currentStreak = 0;
    const today = new Date().toISOString().slice(0, 10);
    const dateSet = new Set(all.map((s) => s.date));
    let check = new Date(today);
    while (true) {
      const d = check.toISOString().slice(0, 10);
      if (dateSet.has(d)) {
        currentStreak++;
        check.setDate(check.getDate() - 1);
      } else {
        break;
      }
    }
    return c.json({ currentStreak, dates: all.map((s) => s.date) }, 200);
  })

  // ── Stats ──────────────────────────────────────────────
  .get('/stats', async (c) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const since = sevenDaysAgo.toISOString().slice(0, 10);

    const recentMoods = await db.select().from(moodLogs).where(gte(moodLogs.date, since)).orderBy(moodLogs.date);
    const recentSessions = await db.select().from(sessions).where(gte(sessions.date, since));
    const totalMinutes = recentSessions.reduce((acc, s) => acc + Math.floor(s.duration / 60), 0);
    const avgMood = recentMoods.length > 0
      ? recentMoods.reduce((a, m) => a + m.mood, 0) / recentMoods.length
      : 0;

    return c.json({
      recentMoods,
      totalMinutes,
      avgMood: Math.round(avgMood * 10) / 10,
      sessionCount: recentSessions.length,
    }, 200);
  });

async function upsertStreak(date: string) {
  const existing = await db.select().from(streaks).where(eq(streaks.date, date));
  if (existing.length > 0) {
    await db.update(streaks)
      .set({ activityCount: existing[0].activityCount + 1 })
      .where(eq(streaks.date, date));
  } else {
    await db.insert(streaks).values({ date, activityCount: 1 });
  }
}

export type AppType = typeof app;
export default app;
