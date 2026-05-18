import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../lib/api";
import { useTheme } from "../../lib/ThemeContext";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const MOODS = [
  { score: 1, emoji: "😞", label: "Rough", color: "#FF6B6B" },
  { score: 2, emoji: "😕", label: "Meh", color: "#FFB347" },
  { score: 3, emoji: "😐", label: "Okay", color: "#FFD700" },
  { score: 4, emoji: "🙂", label: "Good", color: "#00E5BF" },
  { score: 5, emoji: "😄", label: "Great", color: "#7C5CFC" },
];

export default function MoodScreen() {
  const router = useRouter();
  const { C } = useTheme();
  const s = makeStyles(C);

  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const moodQ = useQuery({
    queryKey: ["mood"],
    queryFn: async () => (await api.mood.$get()).json(),
  });

  const todayLog = moodQ.data?.find((m: any) => m.date === today);

  const logMood = useMutation({
    mutationFn: async (data: { date: string; mood: number; note?: string }) =>
      (await api.mood.$post({ json: data })).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mood"] });
      qc.invalidateQueries({ queryKey: ["streaks"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      setSaved(true);
      setSelectedMood(null);
      setNote("");
      setTimeout(() => setSaved(false), 2000);
    },
  });

  function handleSave() {
    if (!selectedMood) return;
    logMood.mutate({ date: today, mood: selectedMood, note: note.trim() || undefined });
  }

  const last14 = getLast14Days();
  const moodMap: Record<string, number> = {};
  moodQ.data?.forEach((m: any) => { moodMap[m.date] = m.mood; });

  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

          <View style={s.topRow}>
            <TouchableOpacity style={s.gearBtn} onPress={() => router.push("/settings" as any)}>
              <Ionicons name="settings-sharp" color={C.sub} size={22} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.title}>Mood</Text>
              <Text style={s.sub}>Track how you feel each day</Text>
            </View>
          </View>

          {/* Today */}
          <View style={s.card}>
            <Text style={s.cardLabel}>Today — {formatDate(today)}</Text>
            {todayLog && !selectedMood ? (
              <View style={{ alignItems: "center", paddingVertical: 12 }}>
                <Text style={{ fontSize: 52 }}>{MOODS[todayLog.mood - 1].emoji}</Text>
                <Text style={[s.moodName, { color: MOODS[todayLog.mood - 1].color }]}>{MOODS[todayLog.mood - 1].label}</Text>
                {todayLog.note ? <Text style={s.notePreview}>"{todayLog.note}"</Text> : null}
                <TouchableOpacity onPress={() => setSelectedMood(todayLog.mood)} style={s.editBtn}>
                  <Text style={s.editBtnText}>Update mood</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={s.moodRow}>
                  {MOODS.map((m) => (
                    <TouchableOpacity
                      key={m.score}
                      style={[s.moodOption, selectedMood === m.score && { borderColor: m.color, borderWidth: 2, backgroundColor: m.color + "22" }]}
                      onPress={() => setSelectedMood(m.score)}
                    >
                      <Text style={s.moodEmoji}>{m.emoji}</Text>
                      <Text style={[s.moodLabel, selectedMood === m.score && { color: m.color }]}>{m.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={s.noteInput}
                  placeholder="Add a note (optional)"
                  placeholderTextColor={C.muted}
                  value={note}
                  onChangeText={setNote}
                  multiline
                  maxLength={200}
                />
                <TouchableOpacity
                  style={[s.saveBtn, !selectedMood && { opacity: 0.4 }]}
                  onPress={handleSave}
                  disabled={!selectedMood || logMood.isPending}
                >
                  <Text style={s.saveBtnText}>
                    {saved ? "✓ Saved!" : logMood.isPending ? "Saving..." : "Save Mood"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Chart */}
          <Text style={s.sectionTitle}>Last 14 Days</Text>
          <View style={s.chartCard}>
            <View style={s.chartRow}>
              {last14.map((d) => {
                const mood = moodMap[d];
                const moodData = mood ? MOODS[mood - 1] : null;
                const barH = mood ? (mood / 5) * 70 : 4;
                return (
                  <View key={d} style={s.chartBar}>
                    <View style={[s.bar, { height: barH, backgroundColor: moodData ? moodData.color : C.border }]} />
                    <Text style={s.barDay}>{new Date(d + "T00:00:00").toLocaleDateString("en", { weekday: "narrow" })}</Text>
                  </View>
                );
              })}
            </View>
            <View style={s.chartLegend}>
              {MOODS.map((m) => (
                <View key={m.score} style={s.legendItem}>
                  <View style={[s.legendDot, { backgroundColor: m.color }]} />
                  <Text style={s.legendText}>{m.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Recent */}
          {moodQ.data && moodQ.data.length > 0 && (
            <>
              <Text style={s.sectionTitle}>Recent Logs</Text>
              {moodQ.data.slice(0, 7).map((log: any) => {
                const m = MOODS[log.mood - 1];
                return (
                  <View key={log.id} style={s.logRow}>
                    <Text style={{ fontSize: 28 }}>{m.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.logMood, { color: m.color }]}>{m.label}</Text>
                      <Text style={s.logDate}>{formatDate(log.date)}</Text>
                    </View>
                    {log.note ? <Text style={s.logNote} numberOfLines={1}>{log.note}</Text> : null}
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function getLast14Days() {
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function formatDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function makeStyles(C: any) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    scroll: { flex: 1, paddingHorizontal: 20 },
    topRow: { flexDirection: "row", alignItems: "flex-start", marginTop: 16, marginBottom: 20 },
    gearBtn: { width: 42, height: 42, borderRadius: 13, backgroundColor: C.surface2, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: C.border },
    title: { color: C.text, fontSize: 26, fontWeight: "800", marginBottom: 2 },
    sub: { color: C.sub, fontSize: 13 },
    card: { backgroundColor: C.surface, borderRadius: 20, padding: 18, marginBottom: 24, borderWidth: 1, borderColor: C.border },
    cardLabel: { color: C.sub, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 },
    moodName: { fontSize: 20, fontWeight: "800", marginTop: 8 },
    notePreview: { color: C.sub, fontSize: 13, marginTop: 6, fontStyle: "italic" },
    editBtn: { marginTop: 12, backgroundColor: C.surface2, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
    editBtnText: { color: C.accent, fontSize: 13, fontWeight: "600" },
    moodRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
    moodOption: { alignItems: "center", backgroundColor: C.surface2, borderRadius: 14, padding: 10, flex: 1, marginHorizontal: 3, borderWidth: 1, borderColor: "transparent" },
    moodEmoji: { fontSize: 28 },
    moodLabel: { color: C.sub, fontSize: 11, fontWeight: "600", marginTop: 4 },
    noteInput: { backgroundColor: C.surface2, borderRadius: 12, padding: 14, color: C.text, fontSize: 14, borderWidth: 1, borderColor: C.border, minHeight: 80, textAlignVertical: "top", marginBottom: 14 },
    saveBtn: { backgroundColor: C.accent, borderRadius: 14, paddingVertical: 16, alignItems: "center" },
    saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
    sectionTitle: { color: C.text, fontSize: 18, fontWeight: "700", marginBottom: 12 },
    chartCard: { backgroundColor: C.surface, borderRadius: 20, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: C.border },
    chartRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: 90, marginBottom: 12 },
    chartBar: { flex: 1, alignItems: "center", gap: 4 },
    bar: { width: "70%", borderRadius: 4, minHeight: 4 },
    barDay: { color: C.muted, fontSize: 9, fontWeight: "600" },
    chartLegend: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
    legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { color: C.sub, fontSize: 11 },
    logRow: { flexDirection: "row", alignItems: "center", backgroundColor: C.surface, borderRadius: 14, padding: 14, marginBottom: 8, gap: 12, borderWidth: 1, borderColor: C.border },
    logMood: { fontSize: 15, fontWeight: "700" },
    logDate: { color: C.muted, fontSize: 12, marginTop: 2 },
    logNote: { color: C.sub, fontSize: 12, maxWidth: 100 },
  });
}
