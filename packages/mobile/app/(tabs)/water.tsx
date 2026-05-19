import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  TextInput,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
let Notifications: typeof import("expo-notifications") | null = null;
try { Notifications = require("expo-notifications"); } catch (_) {}
import { useTheme } from "../../lib/ThemeContext";

// ─── Toast ────────────────────────────────────────────────────────────────────
function useToast() {
  const [msg, setMsg] = useState("");
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function show(text: string) {
    setMsg(text);
    if (timer.current) clearTimeout(timer.current);
    Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
    timer.current = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    }, 2200);
  }

  const element = msg ? (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        bottom: 36,
        left: 24,
        right: 24,
        zIndex: 999,
        alignItems: "center",
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
      }}
    >
      <View style={{ backgroundColor: "#1C1C1E", borderRadius: 18, paddingHorizontal: 24, paddingVertical: 14, maxWidth: 340 }}>
        <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600", textAlign: "center" }}>{msg}</Text>
      </View>
    </Animated.View>
  ) : null;

  return { show, element };
}

const GLASS_ML = 250;
const GOAL_OPTIONS = [6, 7, 8, 10, 12];
const REMINDER_INTERVALS = [
  { label: "30 min", seconds: 1800 },
  { label: "1 hr", seconds: 3600 },
  { label: "2 hr", seconds: 7200 },
  { label: "3 hr", seconds: 10800 },
  { label: "Custom", seconds: 0 },
];

const BOTTLE_W = 130;
const BOTTLE_H = 240;

// ─── Wave Bottle (pure RN, no SVG) ───────────────────────────────────────────
function WaveBottle({ progress, color }: { progress: number; color: string }) {
  const fillAnim = useRef(new Animated.Value(progress)).current;
  const wave1 = useRef(new Animated.Value(0)).current;
  const wave2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.timing(wave1, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true })).start();
    Animated.loop(Animated.timing(wave2, { toValue: 1, duration: 2800, easing: Easing.linear, useNativeDriver: true })).start();
  }, []);

  useEffect(() => {
    Animated.timing(fillAnim, { toValue: progress, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [progress]);

  const fillH = fillAnim.interpolate({ inputRange: [0, 1], outputRange: [0, BOTTLE_H * 0.78] });

  const tx1 = wave1.interpolate({ inputRange: [0, 1], outputRange: [0, -BOTTLE_W * 2] });
  const tx2 = wave2.interpolate({ inputRange: [0, 1], outputRange: [0, -BOTTLE_W * 2] });

  return (
    <View style={{ width: BOTTLE_W, height: BOTTLE_H }}>
      {/* Bottle shell */}
      <View style={{
        position: "absolute", bottom: 0, left: BOTTLE_W * 0.08, right: BOTTLE_W * 0.08,
        height: BOTTLE_H * 0.82, borderRadius: 22, borderWidth: 2, borderColor: color,
        backgroundColor: color + "14", overflow: "hidden",
      }}>
        {/* Animated fill */}
        <Animated.View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: fillH, overflow: "hidden" }}>
          {/* Wave 1 */}
          <Animated.View style={{ position: "absolute", top: -14, left: 0, flexDirection: "row", transform: [{ translateX: tx1 }] }}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={{
                width: BOTTLE_W, height: 28,
                borderTopLeftRadius: BOTTLE_W / 2, borderTopRightRadius: BOTTLE_W / 2,
                backgroundColor: color, opacity: 0.25,
                marginRight: 0,
              }} />
            ))}
          </Animated.View>
          {/* Wave 2 */}
          <Animated.View style={{ position: "absolute", top: -8, left: 0, flexDirection: "row", transform: [{ translateX: tx2 }] }}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={{
                width: BOTTLE_W, height: 20,
                borderTopLeftRadius: BOTTLE_W / 2, borderTopRightRadius: BOTTLE_W / 2,
                backgroundColor: color, opacity: 0.4,
                marginRight: 0,
              }} />
            ))}
          </Animated.View>
          {/* Solid fill below wave */}
          <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, top: 18, backgroundColor: color, opacity: 0.7 }} />
        </Animated.View>
      </View>

      {/* Bottle neck */}
      <View style={{
        position: "absolute", top: 0,
        left: BOTTLE_W * 0.3, right: BOTTLE_W * 0.3,
        height: BOTTLE_H * 0.2,
        borderTopLeftRadius: 8, borderTopRightRadius: 8,
        borderWidth: 2, borderColor: color,
        backgroundColor: color + "14",
      }} />

      {/* Neck-body connector cover */}
      <View style={{
        position: "absolute",
        top: BOTTLE_H * 0.17,
        left: BOTTLE_W * 0.08 + 2,
        right: BOTTLE_W * 0.08 + 2,
        height: 6,
        backgroundColor: color + "14",
      }} />
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function WaterScreen() {
  const { C } = useTheme();
  const s = makeStyles(C);

  const [goal, setGoal] = useState(8);
  const [glasses, setGlasses] = useState(0);
  const [reminderInterval, setReminderInterval] = useState(REMINDER_INTERVALS[1]);
  const [remindersActive, setRemindersActive] = useState(false);
  const [customMinutes, setCustomMinutes] = useState("45");
  const [history, setHistory] = useState<{ date: string; glasses: number }[]>([]);
  const [showGoal, setShowGoal] = useState(false);
  const [showReminder, setShowReminder] = useState(false);

  const toast = useToast();
  const popAnim = useRef(new Animated.Value(1)).current;
  const isCustom = reminderInterval.seconds === 0;
  const progress = Math.min(glasses / goal, 1);
  const ml = glasses * GLASS_ML;
  const goalMl = goal * GLASS_ML;
  const fillColor = progress >= 1 ? C.teal : C.accent;

  useEffect(() => {
    async function setup() {
      if (Platform.OS === "android" && Notifications) {
        await Notifications.setNotificationChannelAsync("water-reminders", {
          name: "Water Reminders",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#7C5CFC",
          sound: "default",
          enableVibrate: true,
        });
      }
      await Notifications?.requestPermissionsAsync();
    }
    setup();
  }, []);

  function pop() {
    Animated.sequence([
      Animated.timing(popAnim, { toValue: 1.18, duration: 90, useNativeDriver: true }),
      Animated.timing(popAnim, { toValue: 1, duration: 130, useNativeDriver: true }),
    ]).start();
  }

  function addGlass() {
    if (glasses >= goal * 2) return;
    pop();
    setGlasses((g) => g + 1);
  }

  function removeGlass() {
    if (glasses <= 0) return;
    setGlasses((g) => g - 1);
  }

  function resetDay() {
    if (glasses > 0) {
      const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
      setHistory((h) => [{ date: today, glasses }, ...h.slice(0, 6)]);
    }
    setGlasses(0);
  }

  async function toggleReminders() {
    if (remindersActive) {
      await Notifications?.cancelAllScheduledNotificationsAsync();
      setRemindersActive(false);
      return;
    }
    if (!Notifications) {
      toast.show("Notifications need a dev build");
      return;
    }
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") {
      toast.show("Enable notifications in settings");
      return;
    }
    let secs = reminderInterval.seconds;
    let label = reminderInterval.label;
    if (isCustom) {
      const mins = parseInt(customMinutes, 10);
      if (isNaN(mins) || mins < 1) { toast.show("Enter at least 1 minute"); return; }
      secs = mins * 60;
      label = `${mins} min`;
    }
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Water Reminder 💧",
        body: "Stay hydrated! Drink a glass of water.",
        sound: "default",
        priority: "max",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secs,
        repeats: true,
        ...(Platform.OS === "android" ? { channelId: "water-reminders" } : {}),
      },
    });
    setRemindersActive(true);
    toast.show(`Reminder set · every ${label}`);
  }

  const statusText =
    progress >= 1 ? "Goal reached! 🎉" :
    progress >= 0.75 ? "Almost there!" :
    progress >= 0.5 ? "Halfway there" :
    progress > 0 ? "Keep going!" : "Start drinking";

  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.container}>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Water</Text>
          <Text style={s.sub}>{statusText}</Text>
        </View>

        {/* Bottle hero */}
        <View style={s.bottleWrap}>
          <Animated.View style={{ transform: [{ scale: popAnim }] }}>
            <WaveBottle progress={progress} color={fillColor} />
          </Animated.View>
          {/* ML overlay */}
          <View style={s.mlOverlay} pointerEvents="none">
            <Text style={[s.mlBig, { color: fillColor }]}>{ml}</Text>
            <Text style={s.mlUnit}>/ {goalMl} ml</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={s.barWrap}>
          <View style={s.barBg}>
            <Animated.View style={[s.barFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: fillColor }]} />
          </View>
          <Text style={[s.barPct, { color: fillColor }]}>{Math.round(progress * 100)}%</Text>
        </View>

        {/* Controls */}
        <View style={s.controls}>
          <TouchableOpacity
            style={[s.iconBtn, glasses <= 0 && { opacity: 0.3 }]}
            onPress={removeGlass}
            disabled={glasses <= 0}
          >
            <Ionicons name="remove" color={C.text} size={22} />
          </TouchableOpacity>

          <TouchableOpacity style={[s.mainBtn, { backgroundColor: fillColor }]} onPress={addGlass} activeOpacity={0.85}>
            <Ionicons name="water-sharp" color="#fff" size={20} />
            <Text style={s.mainBtnText}>+ Glass</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.iconBtn} onPress={resetDay}>
            <Text style={s.resetLabel}>RESET</Text>
          </TouchableOpacity>
        </View>

        {/* Glasses count row */}
        <View style={s.glassRow}>
          {Array.from({ length: goal }).map((_, i) => (
            <View
              key={i}
              style={[
                s.glassDot,
                { backgroundColor: i < glasses ? fillColor : C.surface2, borderColor: i < glasses ? fillColor : C.border },
              ]}
            />
          ))}
        </View>

        {/* Goal + Reminder toggles */}
        <View style={s.settingsRow}>
          <TouchableOpacity style={s.settingChip} onPress={() => { setShowGoal(v => !v); setShowReminder(false); }}>
            <Ionicons name="water-sharp" color={showGoal ? fillColor : C.sub} size={14} />
            <Text style={[s.settingChipText, showGoal && { color: fillColor }]}>Goal: {goal} glasses</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[s.settingChip, remindersActive && { borderColor: C.teal }]} onPress={() => { setShowReminder(v => !v); setShowGoal(false); }}>
            {remindersActive
              ? <Ionicons name="notifications-sharp" color={C.teal} size={14} />
              : <Ionicons name="notifications-off-sharp" color={C.sub} size={14} />}
            <Text style={[s.settingChipText, remindersActive && { color: C.teal }]}>
              {remindersActive ? "Reminders on" : "Reminders"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Goal picker panel */}
        {showGoal && (
          <View style={s.panel}>
            <Text style={s.panelTitle}>Daily Goal</Text>
            <View style={s.goalRow}>
              {GOAL_OPTIONS.map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[s.goalChip, goal === g && { backgroundColor: fillColor, borderColor: fillColor }]}
                  onPress={() => { setGoal(g); setShowGoal(false); }}
                >
                  <Text style={[s.goalChipText, goal === g && { color: "#fff" }]}>{g}</Text>
                  <Text style={[s.goalChipSub, goal === g && { color: "#fff" }]}>glasses</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Reminder panel */}
        {showReminder && (
          <View style={s.panel}>
            <Text style={s.panelTitle}>Remind me every</Text>
            <View style={s.intervalRow}>
              {REMINDER_INTERVALS.map((r) => (
                <TouchableOpacity
                  key={r.seconds}
                  style={[s.intervalChip, reminderInterval.seconds === r.seconds && { borderColor: C.teal, backgroundColor: C.teal + "20" }]}
                  onPress={() => setReminderInterval(r)}
                >
                  <Text style={[s.intervalText, reminderInterval.seconds === r.seconds && { color: C.teal }]}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {isCustom && (
              <View style={s.customRow}>
                <Text style={s.customLabel}>Every</Text>
                <TextInput
                  style={s.customInput}
                  value={customMinutes}
                  onChangeText={(v) => setCustomMinutes(v.replace(/[^0-9]/g, ""))}
                  keyboardType="number-pad"
                  maxLength={4}
                  placeholder="45"
                  placeholderTextColor={C.muted}
                />
                <Text style={s.customLabel}>min</Text>
              </View>
            )}
            <TouchableOpacity
              style={[s.reminderBtn, { backgroundColor: remindersActive ? C.coral + "22" : C.teal }]}
              onPress={toggleReminders}
            >
              {remindersActive
                ? <Ionicons name="notifications-off-sharp" color={C.coral} size={15} />
                : <Ionicons name="notifications-sharp" color="#fff" size={15} />}
              <Text style={[s.reminderBtnText, remindersActive && { color: C.coral }]}>
                {remindersActive ? "Turn off" : "Turn on"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* History */}
        {history.length > 0 && (
          <View style={s.panel}>
            <Text style={s.panelTitle}>Recent Days</Text>
            {history.map((h, i) => (
              <View key={i} style={s.historyRow}>
                <Text style={s.historyDate}>{h.date}</Text>
                <View style={s.historyBarBg}>
                  <View style={[s.historyBarFill, { width: `${Math.min((h.glasses / goal) * 100, 100)}%`, backgroundColor: h.glasses >= goal ? C.teal : C.accent }]} />
                </View>
                <Text style={[s.historyCount, { color: h.glasses >= goal ? C.teal : C.sub }]}>{h.glasses}/{goal}</Text>
              </View>
            ))}
          </View>
        )}

      </ScrollView>
      {toast.element}
    </SafeAreaView>
  );
}

function makeStyles(C: any) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    container: { paddingHorizontal: 24, paddingBottom: 50 },
    header: { marginTop: 20, marginBottom: 8, alignItems: "center" },
    title: { color: C.text, fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
    sub: { color: C.sub, fontSize: 13, marginTop: 2 },
    bottleWrap: { alignItems: "center", marginVertical: 10, position: "relative" },
    mlOverlay: { position: "absolute", bottom: 30, alignItems: "center" },
    mlBig: { fontSize: 36, fontWeight: "800", letterSpacing: -1 },
    mlUnit: { color: C.muted, fontSize: 13, marginTop: 1 },
    barWrap: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 24, marginHorizontal: 4 },
    barBg: { flex: 1, height: 6, backgroundColor: C.surface2, borderRadius: 3, overflow: "hidden" },
    barFill: { height: "100%", borderRadius: 3 },
    barPct: { fontSize: 12, fontWeight: "700", minWidth: 36, textAlign: "right" },
    controls: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 20 },
    iconBtn: { width: 50, height: 50, borderRadius: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
    resetLabel: { fontSize: 8, color: C.muted, fontWeight: "800", letterSpacing: 0.5 },
    mainBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 20 },
    mainBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
    glassRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 24 },
    glassDot: { width: 18, height: 18, borderRadius: 5, borderWidth: 1.5 },
    settingsRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
    settingChip: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 14, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
    settingChipText: { color: C.sub, fontSize: 13, fontWeight: "600" },
    panel: { backgroundColor: C.surface, borderRadius: 18, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: C.border },
    panelTitle: { color: C.text, fontSize: 14, fontWeight: "700", marginBottom: 14 },
    goalRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    goalChip: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface2, minWidth: 56 },
    goalChipText: { color: C.text, fontSize: 18, fontWeight: "800" },
    goalChipSub: { color: C.muted, fontSize: 10, marginTop: 2 },
    intervalRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 14 },
    intervalChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface2 },
    intervalText: { color: C.sub, fontSize: 13, fontWeight: "600" },
    customRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
    customLabel: { color: C.sub, fontSize: 13, fontWeight: "600" },
    customInput: { borderWidth: 1.5, borderColor: C.teal, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, color: C.text, fontSize: 16, fontWeight: "700", minWidth: 70, textAlign: "center", backgroundColor: C.surface2 },
    reminderBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 13, paddingVertical: 13 },
    reminderBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
    historyRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 7 },
    historyDate: { color: C.sub, fontSize: 12, fontWeight: "600", width: 50 },
    historyBarBg: { flex: 1, height: 5, backgroundColor: C.surface2, borderRadius: 3, overflow: "hidden" },
    historyBarFill: { height: "100%", borderRadius: 3 },
    historyCount: { fontSize: 12, fontWeight: "700", minWidth: 36, textAlign: "right" },
  });
}
