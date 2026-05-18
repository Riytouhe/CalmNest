import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../lib/ThemeContext";

const { width } = Dimensions.get("window");
const MOODS = ["😞", "😕", "😐", "🙂", "😄"];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomeScreen() {
  const router = useRouter();
  const { C } = useTheme();
  const s = makeStyles(C);

  const streakQ = useQuery({
    queryKey: ["streaks"],
    queryFn: async () => (await api.streaks.$get()).json(),
  });
  const statsQ = useQuery({
    queryKey: ["stats"],
    queryFn: async () => (await api.stats.$get()).json(),
  });
  const moodQ = useQuery({
    queryKey: ["mood"],
    queryFn: async () => (await api.mood.$get()).json(),
  });

  const today = new Date().toISOString().slice(0, 10);
  const todayMood = moodQ.data?.find((m: any) => m.date === today);
  const streak = streakQ.data?.currentStreak ?? 0;
  const totalMins = statsQ.data?.totalMinutes ?? 0;

  const quickActions = [
    { label: "Breathe", sub: "Calm your mind", ionicon: "cloud-sharp", color: C.accent, route: "/(tabs)/breathe" },
    { label: "Meditate", sub: "Find your focus", ionicon: "timer-sharp", color: C.teal, route: "/(tabs)/meditate" },
    { label: "Mood", sub: "Log today's mood", ionicon: "happy-sharp", color: C.coral, route: "/(tabs)/mood" },
  ];

  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.gearBtn} onPress={() => router.push("/settings" as any)}>
            <Ionicons name="settings-sharp" color={C.sub} size={22} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.greeting}>{getGreeting()} 👋</Text>
            <Text style={s.title}>How are you today?</Text>
          </View>
          <View style={s.streakBadge}>
            <Ionicons name="flame-sharp" color={C.coral} size={18} />
            <Text style={s.streakNum}>{streak}</Text>
          </View>
        </View>

        {/* Today's Mood */}
        <View style={s.moodCard}>
          <Text style={s.cardLabel}>Today's Mood</Text>
          {todayMood ? (
            <View style={s.moodRow}>
              <Text style={s.moodEmoji}>{MOODS[todayMood.mood - 1]}</Text>
              <View>
                <Text style={s.moodText}>
                  {["Rough", "Meh", "Okay", "Good", "Great"][todayMood.mood - 1]}
                </Text>
                {todayMood.note ? <Text style={s.moodNote}>{todayMood.note}</Text> : null}
              </View>
            </View>
          ) : (
            <TouchableOpacity style={s.logMoodBtn} onPress={() => router.push("/(tabs)/mood" as any)}>
              <Text style={s.logMoodText}>+ Log your mood</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stats Row */}
        <View style={s.statsRow}>
          <View style={[s.statCard, { flex: 1, marginRight: 8 }]}>
            <Ionicons name="flame-sharp" color={C.coral} size={22} />
            <Text style={s.statNum}>{streak}</Text>
            <Text style={s.statLabel}>Day Streak</Text>
          </View>
          <View style={[s.statCard, { flex: 1, marginLeft: 8 }]}>
            <Ionicons name="star-sharp" color={C.accent} size={22} />
            <Text style={s.statNum}>{totalMins}</Text>
            <Text style={s.statLabel}>Min This Week</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={s.sectionTitle}>Quick Start</Text>
        {quickActions.map((a) => (
          <TouchableOpacity
            key={a.label}
            style={s.actionCard}
            onPress={() => router.push(a.route as any)}
            activeOpacity={0.8}
          >
            <View style={[s.actionIcon, { backgroundColor: a.color + "22" }]}>
              <Ionicons name={a.ionicon as any} color={a.color} size={26} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.actionLabel}>{a.label}</Text>
              <Text style={s.actionSub}>{a.sub}</Text>
            </View>
            <View style={[s.actionArrow, { backgroundColor: a.color }]}>
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>›</Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Recent mood week */}
        {moodQ.data && moodQ.data.length > 0 && (
          <>
            <Text style={s.sectionTitle}>This Week</Text>
            <View style={s.weekRow}>
              {getLast7Days().map((d) => {
                const log = moodQ.data?.find((m: any) => m.date === d);
                const dayName = new Date(d + "T00:00:00").toLocaleDateString("en", { weekday: "short" });
                return (
                  <View key={d} style={s.dayCol}>
                    <View style={[s.dayDot, log ? { backgroundColor: C.teal } : { backgroundColor: C.border }]}>
                      {log ? <Text style={{ fontSize: 14 }}>{MOODS[log.mood - 1]}</Text> : null}
                    </View>
                    <Text style={s.dayLabel}>{dayName}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function makeStyles(C: any) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    scroll: { flex: 1, paddingHorizontal: 20 },
    header: { flexDirection: "row", alignItems: "center", marginTop: 16, marginBottom: 20 },
    gearBtn: { width: 42, height: 42, borderRadius: 13, backgroundColor: C.surface2, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: C.border },
    greeting: { color: C.sub, fontSize: 14, fontWeight: "500" },
    title: { color: C.text, fontSize: 22, fontWeight: "700", marginTop: 2 },
    streakBadge: { flexDirection: "row", alignItems: "center", backgroundColor: C.surface2, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, gap: 4 },
    streakNum: { color: C.coral, fontSize: 16, fontWeight: "700" },
    moodCard: { backgroundColor: C.surface, borderRadius: 20, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: C.border },
    cardLabel: { color: C.sub, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
    moodRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    moodEmoji: { fontSize: 40 },
    moodText: { color: C.text, fontSize: 18, fontWeight: "700" },
    moodNote: { color: C.sub, fontSize: 13, marginTop: 2 },
    logMoodBtn: { backgroundColor: C.accent + "22", borderRadius: 10, padding: 12, alignItems: "center" },
    logMoodText: { color: C.accent, fontWeight: "600", fontSize: 14 },
    statsRow: { flexDirection: "row", marginBottom: 24 },
    statCard: { backgroundColor: C.surface, borderRadius: 16, padding: 16, alignItems: "center", borderWidth: 1, borderColor: C.border, gap: 4 },
    statNum: { color: C.text, fontSize: 24, fontWeight: "800" },
    statLabel: { color: C.sub, fontSize: 12 },
    sectionTitle: { color: C.text, fontSize: 18, fontWeight: "700", marginBottom: 12 },
    actionCard: { backgroundColor: C.surface, borderRadius: 18, padding: 16, flexDirection: "row", alignItems: "center", marginBottom: 12, borderWidth: 1, borderColor: C.border, gap: 14 },
    actionIcon: { width: 52, height: 52, borderRadius: 14, justifyContent: "center", alignItems: "center" },
    actionLabel: { color: C.text, fontSize: 16, fontWeight: "700" },
    actionSub: { color: C.sub, fontSize: 13, marginTop: 2 },
    actionArrow: { width: 32, height: 32, borderRadius: 10, justifyContent: "center", alignItems: "center" },
    weekRow: { flexDirection: "row", justifyContent: "space-between", backgroundColor: C.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border },
    dayCol: { alignItems: "center", gap: 6 },
    dayDot: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
    dayLabel: { color: C.muted, fontSize: 11, fontWeight: "600" },
  });
}
