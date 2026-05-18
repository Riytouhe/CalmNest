import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../lib/api";
import { useTheme } from "../../lib/ThemeContext";

const { width } = Dimensions.get("window");

const MOODS_EMOJI = ["😞", "😕", "😐", "🙂", "😄"];
const MOOD_COLORS = ["#FF6B6B", "#FFB347", "#FFD700", "#00E5BF", "#7C5CFC"];

// ── Achievement Definitions ──────────────────────────────
type Achievement = {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  color: string;
  check: (data: AchievementData) => boolean;
};

type AchievementData = {
  streak: number;
  totalSessions: number;
  breatheCount: number;
  meditateCount: number;
  totalMins: number;
  avgMood: number;
  moodDaysLogged: number;
  longestStreak: number;
  sessionDays: number;
  hasHappy5: boolean;
};

const ACHIEVEMENTS: Achievement[] = [
  // Streak
  { id: "streak_3",   emoji: "🔥", title: "On a Roll",        desc: "3-day streak",         color: "#FF6B6B", check: (d) => d.streak >= 3 },
  { id: "streak_7",   emoji: "🔥", title: "Week Warrior",     desc: "7-day streak",         color: "#FF6B6B", check: (d) => d.streak >= 7 },
  { id: "streak_14",  emoji: "🔥", title: "Two Week Grind",   desc: "14-day streak",        color: "#FF6B6B", check: (d) => d.streak >= 14 },
  { id: "streak_30",  emoji: "🏆", title: "Habit Builder",    desc: "30-day streak",        color: "#FFB347", check: (d) => d.streak >= 30 },
  // Sessions
  { id: "sess_1",     emoji: "🌱", title: "First Step",       desc: "Complete 1 session",   color: "#00E5BF", check: (d) => d.totalSessions >= 1 },
  { id: "sess_5",     emoji: "✨", title: "Getting Started",  desc: "5 sessions done",      color: "#00E5BF", check: (d) => d.totalSessions >= 5 },
  { id: "sess_25",    emoji: "💪", title: "Committed",        desc: "25 sessions done",     color: "#7C5CFC", check: (d) => d.totalSessions >= 25 },
  { id: "sess_50",    emoji: "🥇", title: "Wellness Pro",     desc: "50 sessions done",     color: "#FFB347", check: (d) => d.totalSessions >= 50 },
  // Minutes
  { id: "mins_30",    emoji: "⏱️", title: "Half Hour",        desc: "30 total minutes",     color: "#7C5CFC", check: (d) => d.totalMins >= 30 },
  { id: "mins_60",    emoji: "⏱️", title: "One Hour",         desc: "60 total minutes",     color: "#7C5CFC", check: (d) => d.totalMins >= 60 },
  { id: "mins_300",   emoji: "⌛", title: "Deep Practice",   desc: "5 hours total",        color: "#7C5CFC", check: (d) => d.totalMins >= 300 },
  // Breathing
  { id: "breathe_1",  emoji: "🌬️", title: "First Breath",    desc: "1 breathing session",  color: "#00E5BF", check: (d) => d.breatheCount >= 1 },
  { id: "breathe_10", emoji: "🌬️", title: "Breath Master",   desc: "10 breathing sessions",color: "#00E5BF", check: (d) => d.breatheCount >= 10 },
  // Meditation
  { id: "med_1",      emoji: "🧘", title: "Mindful Moment",  desc: "1 meditation session", color: "#7C5CFC", check: (d) => d.meditateCount >= 1 },
  { id: "med_10",     emoji: "🧘", title: "Zen Mode",        desc: "10 meditation sessions",color: "#7C5CFC", check: (d) => d.meditateCount >= 10 },
  // Mood
  { id: "mood_3",     emoji: "📓", title: "Mood Tracker",    desc: "3 days of mood logs",  color: "#FFB347", check: (d) => d.moodDaysLogged >= 3 },
  { id: "mood_7",     emoji: "📓", title: "Self Aware",      desc: "7 days of mood logs",  color: "#FFB347", check: (d) => d.moodDaysLogged >= 7 },
  { id: "mood_happy", emoji: "😄", title: "Happy Place",     desc: "Avg mood 4.5 or higher",color: "#FFD700", check: (d) => d.avgMood >= 4.5 },
  // Combo
  { id: "both_types", emoji: "🌟", title: "Well Rounded",    desc: "Try both breathe & meditate", color: "#FFB347", check: (d) => d.breatheCount >= 1 && d.meditateCount >= 1 },
  { id: "week_7sess", emoji: "🎯", title: "Daily Mover",     desc: "Active 7 different days", color: "#7C5CFC", check: (d) => d.sessionDays >= 7 },
];

export default function ProgressScreen() {
  const router = useRouter();
  const { C } = useTheme();
  const s = makeStyles(C);

  const streakQ = useQuery({ queryKey: ["streaks"], queryFn: async () => (await api.streaks.$get()).json() });
  const statsQ = useQuery({ queryKey: ["stats"], queryFn: async () => (await api.stats.$get()).json() });
  const moodQ = useQuery({ queryKey: ["mood"], queryFn: async () => (await api.mood.$get()).json() });
  const sessionsQ = useQuery({ queryKey: ["sessions"], queryFn: async () => (await api.sessions.$get()).json() });

  const streak = streakQ.data?.currentStreak ?? 0;
  const activeDates = new Set(streakQ.data?.dates ?? []);
  const totalMins = statsQ.data?.totalMinutes ?? 0;
  const avgMood = statsQ.data?.avgMood ?? 0;
  const sessionCount = statsQ.data?.sessionCount ?? 0;

  const last35 = getLast35Days();
  const weeks = chunkWeeks(last35);

  const last7 = getLast7Days();
  const moodMap: Record<string, number> = {};
  moodQ.data?.forEach((m: any) => { moodMap[m.date] = m.mood; });

  const sessionData = sessionsQ.data ?? [];
  const breatheCount = sessionData.filter((s: any) => s.type === "breathe").length;
  const meditateCount = sessionData.filter((s: any) => s.type === "meditate").length;
  const totalSessions = breatheCount + meditateCount;
  const sessionDays = new Set(sessionData.map((s: any) => s.date)).size;

  const moodData = moodQ.data ?? [];
  const moodDaysLogged = moodData.length;

  // Longest streak from all dates
  const allDates = (streakQ.data?.dates ?? []).slice().sort();
  let longestStreak = 0, cur = 0, prevDate: Date | null = null;
  for (const d of allDates) {
    const date = new Date(d + "T00:00:00");
    if (prevDate) {
      const diff = (date.getTime() - prevDate.getTime()) / 86400000;
      cur = diff === 1 ? cur + 1 : 1;
    } else { cur = 1; }
    if (cur > longestStreak) longestStreak = cur;
    prevDate = date;
  }

  const achData: AchievementData = {
    streak, totalSessions, breatheCount, meditateCount,
    totalMins, avgMood, moodDaysLogged, longestStreak, sessionDays,
    hasHappy5: avgMood >= 4.5,
  };

  const earned = ACHIEVEMENTS.filter((a) => a.check(achData));
  const locked = ACHIEVEMENTS.filter((a) => !a.check(achData));

  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        <View style={s.topRow}>
          <TouchableOpacity style={s.gearBtn} onPress={() => router.push("/settings" as any)}>
            <Ionicons name="settings-sharp" color={C.sub} size={22} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.title}>Progress</Text>
            <Text style={s.sub}>Your wellness journey at a glance</Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={s.statsGrid}>
          <View style={[s.statCard, { backgroundColor: "#FF6B6B11" }]}>
            <Text style={s.statEmoji}>🔥</Text>
            <Text style={[s.statNum, { color: C.coral }]}>{streak}</Text>
            <Text style={s.statLabel}>Day Streak</Text>
          </View>
          <View style={[s.statCard, { backgroundColor: C.teal + "11" }]}>
            <Text style={s.statEmoji}>⏱️</Text>
            <Text style={[s.statNum, { color: C.teal }]}>{totalMins}</Text>
            <Text style={s.statLabel}>Min This Week</Text>
          </View>
          <View style={[s.statCard, { backgroundColor: C.accent + "11" }]}>
            <Text style={s.statEmoji}>🎯</Text>
            <Text style={[s.statNum, { color: C.accent }]}>{sessionCount}</Text>
            <Text style={s.statLabel}>Sessions / 7d</Text>
          </View>
          <View style={[s.statCard, { backgroundColor: C.amber + "11" }]}>
            <Text style={s.statEmoji}>😊</Text>
            <Text style={[s.statNum, { color: C.amber }]}>{avgMood > 0 ? avgMood.toFixed(1) : "—"}</Text>
            <Text style={s.statLabel}>Avg Mood</Text>
          </View>
        </View>

        {/* Streak Calendar */}
        <Text style={s.sectionTitle}>Streak Calendar</Text>
        <View style={s.calCard}>
          <View style={s.calHeader}>
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <Text key={i} style={s.calDayHeader}>{d}</Text>
            ))}
          </View>
          {weeks.map((week, wi) => (
            <View key={wi} style={s.calWeekRow}>
              {week.map((day, di) => {
                if (!day) return <View key={di} style={s.calDayEmpty} />;
                const isActive = activeDates.has(day);
                const isToday = day === new Date().toISOString().slice(0, 10);
                return (
                  <View key={di} style={[s.calDay, isActive && s.calDayActive, isToday && s.calDayToday]}>
                    <Text style={[s.calDayText, isActive && { color: "#fff" }, isToday && { color: "#fff", fontWeight: "800" }]}>
                      {parseInt(day.slice(-2))}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
          <View style={s.calLegend}>
            <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: C.border }]} /><Text style={s.legendText}>No activity</Text></View>
            <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: C.accent }]} /><Text style={s.legendText}>Active day</Text></View>
            <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: C.teal }]} /><Text style={s.legendText}>Today</Text></View>
          </View>
        </View>

        {/* Mood Trend */}
        <Text style={s.sectionTitle}>Mood This Week</Text>
        <View style={s.chartCard}>
          <View style={s.chartRow}>
            {last7.map((d) => {
              const mood = moodMap[d];
              const barH = mood ? (mood / 5) * 80 : 4;
              const color = mood ? MOOD_COLORS[mood - 1] : C.border;
              const dayName = new Date(d + "T00:00:00").toLocaleDateString("en", { weekday: "short" });
              return (
                <View key={d} style={s.chartBar}>
                  {mood ? <Text style={{ fontSize: 16, marginBottom: 4 }}>{MOODS_EMOJI[mood - 1]}</Text> : <View style={{ height: 20 }} />}
                  <View style={[s.bar, { height: barH, backgroundColor: color }]} />
                  <Text style={s.barLabel}>{dayName}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Session Breakdown */}
        <Text style={s.sectionTitle}>Sessions Breakdown</Text>
        <View style={s.breakCard}>
          <View style={s.breakRow}>
            <View style={[s.breakIcon, { backgroundColor: C.accent + "22" }]}><Text style={{ fontSize: 20 }}>🌬️</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.breakLabel}>Breathing</Text>
              <View style={s.progressBarBg}>
                <View style={[s.progressBarFill, { width: totalSessions > 0 ? `${(breatheCount / totalSessions) * 100}%` : "0%", backgroundColor: C.accent }]} />
              </View>
            </View>
            <Text style={[s.breakCount, { color: C.accent }]}>{breatheCount}</Text>
          </View>
          <View style={[s.breakRow, { marginTop: 14 }]}>
            <View style={[s.breakIcon, { backgroundColor: C.teal + "22" }]}><Text style={{ fontSize: 20 }}>🧘</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.breakLabel}>Meditation</Text>
              <View style={s.progressBarBg}>
                <View style={[s.progressBarFill, { width: totalSessions > 0 ? `${(meditateCount / totalSessions) * 100}%` : "0%", backgroundColor: C.teal }]} />
              </View>
            </View>
            <Text style={[s.breakCount, { color: C.teal }]}>{meditateCount}</Text>
          </View>
        </View>

        {/* Achievements */}
        <View style={s.achHeader}>
          <Text style={s.sectionTitle}>Achievements</Text>
          <Text style={s.achCount}>{earned.length}/{ACHIEVEMENTS.length}</Text>
        </View>

        {earned.length > 0 && (
          <>
            <Text style={s.achSubtitle}>Earned</Text>
            <View style={s.achGrid}>
              {earned.map((a) => (
                <View key={a.id} style={[s.achCard, { borderColor: a.color + "55", backgroundColor: a.color + "11" }]}>
                  <Text style={s.achEmoji}>{a.emoji}</Text>
                  <Text style={[s.achTitle, { color: a.color }]}>{a.title}</Text>
                  <Text style={s.achDesc}>{a.desc}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {locked.length > 0 && (
          <>
            <Text style={[s.achSubtitle, { marginTop: earned.length > 0 ? 16 : 0 }]}>Locked</Text>
            <View style={s.achGrid}>
              {locked.map((a) => (
                <View key={a.id} style={[s.achCard, s.achCardLocked]}>
                  <Text style={[s.achEmoji, { opacity: 0.25 }]}>{a.emoji}</Text>
                  <Text style={[s.achTitle, { color: C.muted }]}>{a.title}</Text>
                  <Text style={s.achDesc}>{a.desc}</Text>
                </View>
              ))}
            </View>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

function getLast35Days() {
  const days: string[] = [];
  for (let i = 34; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function getLast7Days() {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function chunkWeeks(days: string[]): (string | null)[][] {
  const firstDay = new Date(days[0] + "T00:00:00").getDay();
  const padded: (string | null)[] = [...Array(firstDay).fill(null), ...days];
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) {
    const week = padded.slice(i, i + 7);
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}

function makeStyles(C: any) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    scroll: { flex: 1, paddingHorizontal: 20 },
    topRow: { flexDirection: "row", alignItems: "flex-start", marginTop: 16, marginBottom: 20 },
    gearBtn: { width: 42, height: 42, borderRadius: 13, backgroundColor: C.surface2, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: C.border },
    title: { color: C.text, fontSize: 26, fontWeight: "800", marginBottom: 2 },
    sub: { color: C.sub, fontSize: 13 },
    statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
    statCard: { width: (width - 50) / 2, borderRadius: 18, padding: 16, alignItems: "center", gap: 4, borderWidth: 1, borderColor: C.border },
    statEmoji: { fontSize: 24, marginBottom: 4 },
    statNum: { fontSize: 28, fontWeight: "800" },
    statLabel: { color: C.sub, fontSize: 12, textAlign: "center" },
    sectionTitle: { color: C.text, fontSize: 18, fontWeight: "700", marginBottom: 12 },
    calCard: { backgroundColor: C.surface, borderRadius: 20, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: C.border },
    calHeader: { flexDirection: "row", justifyContent: "space-around", marginBottom: 8 },
    calDayHeader: { color: C.muted, fontSize: 11, fontWeight: "700", width: 30, textAlign: "center" },
    calWeekRow: { flexDirection: "row", justifyContent: "space-around", marginBottom: 6 },
    calDayEmpty: { width: 30, height: 30 },
    calDay: { width: 30, height: 30, borderRadius: 8, justifyContent: "center", alignItems: "center", backgroundColor: C.surface2 },
    calDayActive: { backgroundColor: C.accent },
    calDayToday: { backgroundColor: C.teal },
    calDayText: { color: C.muted, fontSize: 11, fontWeight: "600" },
    calLegend: { flexDirection: "row", justifyContent: "center", gap: 16, marginTop: 12 },
    legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { color: C.sub, fontSize: 11 },
    chartCard: { backgroundColor: C.surface, borderRadius: 20, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: C.border },
    chartRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: 120 },
    chartBar: { flex: 1, alignItems: "center", gap: 4 },
    bar: { width: "70%", borderRadius: 6, minHeight: 4 },
    barLabel: { color: C.muted, fontSize: 10, fontWeight: "600" },
    breakCard: { backgroundColor: C.surface, borderRadius: 20, padding: 18, marginBottom: 24, borderWidth: 1, borderColor: C.border },
    breakRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    breakIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
    breakLabel: { color: C.text, fontSize: 14, fontWeight: "600", marginBottom: 6 },
    progressBarBg: { height: 6, backgroundColor: C.border, borderRadius: 3, overflow: "hidden" },
    progressBarFill: { height: 6, borderRadius: 3 },
    breakCount: { fontSize: 20, fontWeight: "800", minWidth: 28, textAlign: "right" },
    amber: { color: C.amber },
    // Achievements
    achHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
    achCount: { color: C.accent, fontSize: 14, fontWeight: "700" },
    achSubtitle: { color: C.sub, fontSize: 13, fontWeight: "600", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
    achGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 4 },
    achCard: {
      width: (width - 50) / 2,
      borderRadius: 18,
      padding: 14,
      alignItems: "center",
      gap: 4,
      borderWidth: 1,
      borderColor: C.border,
    },
    achCardLocked: { backgroundColor: C.surface, borderColor: C.border, opacity: 0.6 },
    achEmoji: { fontSize: 28, marginBottom: 4 },
    achTitle: { fontSize: 13, fontWeight: "700", textAlign: "center" },
    achDesc: { color: C.muted, fontSize: 11, textAlign: "center" },
  });
}
