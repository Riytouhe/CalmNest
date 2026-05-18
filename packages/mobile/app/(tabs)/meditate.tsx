import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { api } from "../../lib/api";
import { useTheme } from "../../lib/ThemeContext";

const DURATIONS = [
  { label: "2 min", seconds: 120 },
  { label: "5 min", seconds: 300 },
  { label: "10 min", seconds: 600 },
  { label: "15 min", seconds: 900 },
  { label: "20 min", seconds: 1200 },
  { label: "30 min", seconds: 1800 },
];

const SOUNDS = [
  { id: "rain",   label: "Rain",         emoji: "🌧️", url: "https://storage.googleapis.com/runable-templates/cli-uploads%2FPYK6rUXcZOIMSNUJN9AjMNAC5AHyXDiU%2FOPP5Tlmc9XBqkrWbZ3CDM%2Frain.mp3" },
  { id: "ocean",  label: "Ocean",        emoji: "🌊", url: "https://storage.googleapis.com/runable-templates/cli-uploads%2FPYK6rUXcZOIMSNUJN9AjMNAC5AHyXDiU%2FmLDOVnWVpuKXXF7cDRs6o%2Focean.mp3" },
  { id: "river",  label: "River",        emoji: "💧", url: "https://storage.googleapis.com/runable-templates/cli-uploads%2FPYK6rUXcZOIMSNUJN9AjMNAC5AHyXDiU%2Fr6g9CtQzRi_mVKIYyf5Fb%2Friver.mp3" },
  { id: "wind",   label: "Wind",         emoji: "🍃", url: "https://storage.googleapis.com/runable-templates/cli-uploads%2FPYK6rUXcZOIMSNUJN9AjMNAC5AHyXDiU%2FzRVT6zOz_EWlhLDNNHOJk%2Fwind.mp3" },
  { id: "forest", label: "Forest",       emoji: "🌲", url: "https://storage.googleapis.com/runable-templates/cli-uploads%2FPYK6rUXcZOIMSNUJN9AjMNAC5AHyXDiU%2Fi1x2vUcrz-lS1NdnAkRLV%2Fforest.mp3" },
  { id: "none",   label: "No sound",     emoji: "🔇", url: null },
];

export default function MeditateScreen() {
  const router = useRouter();
  const { C } = useTheme();
  const s = makeStyles(C);

  const [selectedDuration, setSelectedDuration] = useState(DURATIONS[1]);
  const [selectedSound, setSelectedSound] = useState(SOUNDS[0]);
  const [active, setActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [soundLoading, setSoundLoading] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);
  const soundRef = useRef<Audio.Sound | null>(null);
  const qc = useQueryClient();

  const logSession = useMutation({
    mutationFn: async (duration: number) =>
      (await api.sessions.$post({ json: { type: "meditate", exercise: "calm", duration, date: new Date().toISOString().slice(0, 10) } })).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["streaks"] });
    },
  });

  useEffect(() => {
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: true });
    return () => {
      clearInterval(intervalRef.current);
      pulseAnim.stopAnimation();
      stopSound();
    };
  }, []);

  async function playSound(url: string) {
    try {
      setSoundLoading(true);
      await stopSound();
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { isLooping: true, volume: 0.7 }
      );
      soundRef.current = sound;
      await sound.playAsync();
    } catch (e) {
      // silent fail
    } finally {
      setSoundLoading(false);
    }
  }

  async function stopSound() {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (_) {}
      soundRef.current = null;
    }
  }

  function startPulse() {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }

  async function startSession() {
    setActive(true);
    setCompleted(false);
    setTimeLeft(selectedDuration.seconds);
    startTimeRef.current = Date.now();
    startPulse();
    if (selectedSound.url) await playSound(selectedSound.url);
    let remaining = selectedDuration.seconds;
    intervalRef.current = setInterval(() => {
      remaining--;
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(intervalRef.current);
        pulseAnim.stopAnimation();
        pulseAnim.setValue(1);
        setActive(false);
        setCompleted(true);
        stopSound();
        logSession.mutate(selectedDuration.seconds);
      }
    }, 1000);
  }

  async function stopSession() {
    clearInterval(intervalRef.current);
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
    await stopSound();
    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
    if (elapsed >= 30) logSession.mutate(elapsed);
    setActive(false);
    setTimeLeft(0);
  }

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60);
    const sec = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={s.topRow}>
          <TouchableOpacity style={s.gearBtn} onPress={() => router.push("/settings" as any)}>
            <Ionicons name="settings-sharp" color={C.sub} size={22} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.title}>Meditate</Text>
            <Text style={s.sub}>Set a timer and sit with yourself</Text>
          </View>
        </View>

        {!active && !completed && (
          <>
            <Text style={s.sectionLabel}>Duration</Text>
            <View style={s.durationGrid}>
              {DURATIONS.map((d) => (
                <TouchableOpacity
                  key={d.seconds}
                  style={[s.durationBtn, selectedDuration.seconds === d.seconds && s.durationBtnActive]}
                  onPress={() => setSelectedDuration(d)}
                >
                  <Text style={[s.durationText, selectedDuration.seconds === d.seconds && s.durationTextActive]}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Sound picker */}
            <View style={s.soundHeader}>
              <Ionicons name="musical-note-sharp" color={C.teal} size={15} />
              <Text style={s.sectionLabel}>Ambient Sound</Text>
            </View>
            <View style={s.soundGrid}>
              {SOUNDS.map((snd) => (
                <TouchableOpacity
                  key={snd.id}
                  style={[s.soundChip, selectedSound.id === snd.id && { borderColor: C.teal, backgroundColor: C.teal + "22" }]}
                  onPress={() => setSelectedSound(snd)}
                >
                  <Text style={s.soundEmoji}>{snd.emoji}</Text>
                  <Text style={[s.soundLabel, selectedSound.id === snd.id && { color: C.teal }]}>{snd.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <View style={s.circleWrap}>
          <Animated.View style={[s.outerGlow, { transform: [{ scale: pulseAnim }] }]} />
          <View style={s.timerCircle}>
            {completed ? (
              <View style={{ alignItems: "center" }}>
                <Text style={{ fontSize: 40 }}>🎉</Text>
                <Text style={s.completedText}>Complete!</Text>
                <Text style={s.completedSub}>{selectedDuration.label} done</Text>
              </View>
            ) : (
              <>
                <Text style={s.timerText}>
                  {active ? formatTime(timeLeft) : formatTime(selectedDuration.seconds)}
                </Text>
                <Text style={s.timerLabel}>{active ? "remaining" : "ready"}</Text>
                {active && selectedSound.id !== "none" && (
                  <View style={s.nowPlaying}>
                    <Ionicons name="volume-high-sharp" color={C.teal} size={11} />
                    <Text style={s.nowPlayingText}>{selectedSound.label}</Text>
                  </View>
                )}
              </>
            )}
          </View>
        </View>

        {!active && !completed && (
          <View style={s.tipCard}>
            <Text style={s.tipTitle}>💡 Tip</Text>
            <Text style={s.tipText}>Find a comfortable position, close your eyes, and focus on your breath. Let thoughts pass like clouds.</Text>
          </View>
        )}

        {!completed ? (
          <TouchableOpacity
            style={[s.btn, active && { backgroundColor: C.coral + "22" }]}
            onPress={active ? stopSession : startSession}
            activeOpacity={0.85}
          >
            <Text style={[s.btnText, active && { color: C.coral }]}>
              {active ? "End Session" : "Begin Session"}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={s.btn}
            onPress={() => { setCompleted(false); setTimeLeft(0); }}
            activeOpacity={0.85}
          >
            <Text style={s.btnText}>Meditate Again</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(C: any) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    scroll: { flex: 1, paddingHorizontal: 20 },
    topRow: { flexDirection: "row", alignItems: "flex-start", marginTop: 16, marginBottom: 20 },
    gearBtn: { width: 42, height: 42, borderRadius: 13, backgroundColor: C.surface2, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: C.border },
    title: { color: C.text, fontSize: 26, fontWeight: "800", marginBottom: 2 },
    sub: { color: C.sub, fontSize: 13 },
    sectionLabel: { color: C.sub, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
    soundHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
    durationGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
    durationBtn: { backgroundColor: C.surface, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, borderWidth: 1, borderColor: C.border },
    durationBtnActive: { backgroundColor: C.accent, borderColor: C.accent },
    durationText: { color: C.sub, fontSize: 14, fontWeight: "600" },
    durationTextActive: { color: "#fff" },
    soundGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 },
    soundChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.surface, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: C.border },
    soundEmoji: { fontSize: 14 },
    soundLabel: { color: C.sub, fontSize: 13, fontWeight: "600" },
    circleWrap: { alignItems: "center", justifyContent: "center", marginBottom: 24, height: 220 },
    outerGlow: { position: "absolute", width: 210, height: 210, borderRadius: 105, backgroundColor: C.teal + "18" },
    timerCircle: { width: 175, height: 175, borderRadius: 88, backgroundColor: C.surface2, borderWidth: 3, borderColor: C.teal, alignItems: "center", justifyContent: "center" },
    timerText: { color: C.text, fontSize: 40, fontWeight: "800" },
    timerLabel: { color: C.sub, fontSize: 12, marginTop: 2 },
    nowPlaying: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
    nowPlayingText: { color: C.teal, fontSize: 11, fontWeight: "600" },
    completedText: { color: C.text, fontSize: 18, fontWeight: "800", marginTop: 6 },
    completedSub: { color: C.teal, fontSize: 13, marginTop: 2 },
    tipCard: { backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: C.border },
    tipTitle: { color: C.text, fontSize: 14, fontWeight: "700", marginBottom: 6 },
    tipText: { color: C.sub, fontSize: 13, lineHeight: 20 },
    btn: { backgroundColor: C.accent, borderRadius: 16, paddingVertical: 18, alignItems: "center" },
    btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  });
}
