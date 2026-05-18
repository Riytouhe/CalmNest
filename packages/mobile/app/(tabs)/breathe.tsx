import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  ScrollView,
  TextInput,
  LayoutAnimation,
  UIManager,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../lib/api";
import { useTheme } from "../../lib/ThemeContext";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const BUILT_IN_COLORS = ["#7C5CFC", "#00E5BF", "#FF6B6B", "#F59E0B", "#3B82F6", "#EC4899"];
const PHASE_LABELS = ["Inhale", "Hold", "Exhale", "Hold 2", "Recovery"];

type Phase = { label: string; duration: number };
type Exercise = {
  id: string;
  name: string;
  desc: string;
  colorKey?: string;
  color?: string;
  phases: Phase[];
  custom?: boolean;
};

const BUILT_INS: Exercise[] = [
  {
    id: "box",
    name: "Box Breathing",
    desc: "Equal inhale, hold, exhale, hold",
    colorKey: "accent",
    phases: [
      { label: "Inhale", duration: 4 },
      { label: "Hold", duration: 4 },
      { label: "Exhale", duration: 4 },
      { label: "Hold", duration: 4 },
    ],
  },
  {
    id: "478",
    name: "4-7-8 Breathing",
    desc: "Relax & fall asleep faster",
    colorKey: "teal",
    phases: [
      { label: "Inhale", duration: 4 },
      { label: "Hold", duration: 7 },
      { label: "Exhale", duration: 8 },
    ],
  },
  {
    id: "calm",
    name: "Calm Breath",
    desc: "Simple slow breathing",
    colorKey: "coral",
    phases: [
      { label: "Inhale", duration: 5 },
      { label: "Exhale", duration: 5 },
    ],
  },
];

function makeDefaultCustom(): Exercise {
  return {
    id: `custom_${Date.now()}`,
    name: "",
    desc: "",
    color: BUILT_IN_COLORS[0],
    phases: [
      { label: "Inhale", duration: 4 },
      { label: "Exhale", duration: 4 },
    ],
    custom: true,
  };
}

// ── Custom Exercise Editor Card ──────────────────────────────────────────────
function CustomEditorCard({
  draft,
  onChange,
  onSave,
  onDiscard,
  C,
}: {
  draft: Exercise;
  onChange: (e: Exercise) => void;
  onSave: () => void;
  onDiscard: () => void;
  C: any;
}) {
  const s = editorStyles(C);

  function updatePhase(i: number, field: "label" | "duration", val: string) {
    const phases = draft.phases.map((p, idx) =>
      idx === i ? { ...p, [field]: field === "duration" ? Math.max(1, parseInt(val) || 1) : val } : p
    );
    onChange({ ...draft, phases });
  }

  function addPhase() {
    if (draft.phases.length >= 5) return;
    onChange({ ...draft, phases: [...draft.phases, { label: "Hold", duration: 4 }] });
  }

  function removePhase(i: number) {
    if (draft.phases.length <= 2) return;
    onChange({ ...draft, phases: draft.phases.filter((_, idx) => idx !== i) });
  }

  const canSave = draft.name.trim().length > 0 && draft.phases.length >= 2;

  return (
    <View style={[s.card, { borderColor: draft.color }]}>
      {/* Name */}
      <Text style={s.label}>Name</Text>
      <TextInput
        style={s.input}
        placeholder="e.g. Morning Calm"
        placeholderTextColor={C.muted}
        value={draft.name}
        onChangeText={(t) => onChange({ ...draft, name: t })}
      />

      {/* Color picker */}
      <Text style={[s.label, { marginTop: 12 }]}>Color</Text>
      <View style={s.colorRow}>
        {BUILT_IN_COLORS.map((col) => (
          <TouchableOpacity
            key={col}
            style={[s.colorDot, { backgroundColor: col }, draft.color === col && s.colorDotSelected]}
            onPress={() => onChange({ ...draft, color: col })}
          />
        ))}
      </View>

      {/* Phases */}
      <Text style={[s.label, { marginTop: 14 }]}>Phases</Text>
      {draft.phases.map((p, i) => (
        <View key={i} style={s.phaseRow}>
          {/* Label picker */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ gap: 6, paddingRight: 4 }}>
            {PHASE_LABELS.map((lbl) => (
              <TouchableOpacity
                key={lbl}
                style={[s.labelChip, p.label === lbl && { backgroundColor: draft.color + "44", borderColor: draft.color }]}
                onPress={() => updatePhase(i, "label", lbl)}
              >
                <Text style={[s.labelChipText, p.label === lbl && { color: draft.color }]}>{lbl}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Duration stepper */}
          <View style={s.stepper}>
            <TouchableOpacity onPress={() => updatePhase(i, "duration", String(p.duration - 1))} style={s.stepBtn}>
              <Ionicons name="chevron-down" color={C.sub} size={14} />
            </TouchableOpacity>
            <Text style={s.stepVal}>{p.duration}s</Text>
            <TouchableOpacity onPress={() => updatePhase(i, "duration", String(p.duration + 1))} style={s.stepBtn}>
              <Ionicons name="chevron-up" color={C.sub} size={14} />
            </TouchableOpacity>
          </View>

          {/* Remove */}
          <TouchableOpacity
            onPress={() => removePhase(i)}
            style={[s.removeBtn, draft.phases.length <= 2 && { opacity: 0.25 }]}
            disabled={draft.phases.length <= 2}
          >
            <Ionicons name="trash-sharp" color={C.coral} size={15} />
          </TouchableOpacity>
        </View>
      ))}

      {draft.phases.length < 5 && (
        <TouchableOpacity style={[s.addPhaseBtn, { borderColor: draft.color + "66" }]} onPress={addPhase}>
          <Ionicons name="add" color={draft.color} size={13} />
          <Text style={[s.addPhaseText, { color: draft.color }]}>Add phase</Text>
        </TouchableOpacity>
      )}

      {/* Actions */}
      <View style={s.actions}>
        <TouchableOpacity style={s.discardBtn} onPress={onDiscard}>
          <Text style={s.discardText}>Discard</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.saveBtn, { backgroundColor: canSave ? draft.color : C.surface2 }]}
          onPress={onSave}
          disabled={!canSave}
        >
          <Ionicons name="checkmark" color={canSave ? "#fff" : C.muted} size={15} />
          <Text style={[s.saveText, !canSave && { color: C.muted }]}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────
export default function BreatheScreen() {
  const router = useRouter();
  const { C } = useTheme();
  const s = makeStyles(C);

  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [draft, setDraft] = useState<Exercise | null>(null); // null = editor closed

  const allExercises = [...BUILT_INS, ...customExercises];
  const [selected, setSelected] = useState<Exercise>(BUILT_INS[0]);
  const [active, setActive] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.6)).current;
  const intervalRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);
  const qc = useQueryClient();

  const accentColor = selected.colorKey ? (C as any)[selected.colorKey] : selected.color ?? C.accent;

  const logSession = useMutation({
    mutationFn: async (duration: number) =>
      (
        await api.sessions.$post({
          json: {
            type: "breathe",
            exercise: selected.id,
            duration,
            date: new Date().toISOString().slice(0, 10),
          },
        })
      ).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["streaks"] });
    },
  });

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  function animatePhase(phase: Phase) {
    if (phase.label === "Inhale") {
      Animated.parallel([
        Animated.timing(scaleAnim, { toValue: 1.5, duration: phase.duration * 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: phase.duration * 1000, useNativeDriver: true }),
      ]).start();
    } else if (phase.label === "Exhale") {
      Animated.parallel([
        Animated.timing(scaleAnim, { toValue: 1, duration: phase.duration * 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0.6, duration: phase.duration * 1000, useNativeDriver: true }),
      ]).start();
    }
  }

  function startExercise() {
    setActive(true);
    setPhaseIdx(0);
    setElapsed(0);
    startTimeRef.current = Date.now();
    const phase = selected.phases[0];
    setCountdown(phase.duration);
    animatePhase(phase);
    let currentPhase = 0;
    let currentCount = phase.duration;
    intervalRef.current = setInterval(() => {
      currentCount--;
      setCountdown(currentCount);
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      if (currentCount <= 0) {
        currentPhase = (currentPhase + 1) % selected.phases.length;
        const next = selected.phases[currentPhase];
        currentCount = next.duration;
        setPhaseIdx(currentPhase);
        setCountdown(next.duration);
        animatePhase(next);
      }
    }, 1000);
  }

  function stopExercise() {
    clearInterval(intervalRef.current);
    const dur = Math.floor((Date.now() - startTimeRef.current) / 1000);
    if (dur >= 5) logSession.mutate(dur);
    setActive(false);
    setPhaseIdx(0);
    setCountdown(0);
    scaleAnim.setValue(1);
    opacityAnim.setValue(0.6);
  }

  function openEditor() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setDraft(makeDefaultCustom());
  }

  function saveCustom() {
    if (!draft) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const saved = { ...draft, desc: draft.phases.map((p) => `${p.label} ${p.duration}s`).join(" · ") };
    setCustomExercises((prev) => [...prev, saved]);
    setSelected(saved);
    setDraft(null);
  }

  function discardDraft() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setDraft(null);
  }

  function deleteCustom(id: string) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCustomExercises((prev) => prev.filter((e) => e.id !== id));
    if (selected.id === id) setSelected(BUILT_INS[0]);
  }

  const phase = selected.phases[phaseIdx];

  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={s.topRow}>
          <TouchableOpacity style={s.gearBtn} onPress={() => router.push("/settings" as any)}>
            <Ionicons name="settings-sharp" color={C.sub} size={22} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.title}>Breathe</Text>
            <Text style={s.sub}>Choose an exercise and follow the guide</Text>
          </View>
        </View>

        {!active && (
          <>
            <View style={s.exerciseList}>
              {/* Built-ins */}
              {BUILT_INS.map((ex) => {
                const col = (C as any)[ex.colorKey!];
                return (
                  <TouchableOpacity
                    key={ex.id}
                    style={[s.exCard, selected.id === ex.id && { borderColor: col, borderWidth: 2 }]}
                    onPress={() => setSelected(ex)}
                    activeOpacity={0.8}
                  >
                    <View style={[s.exDot, { backgroundColor: col }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.exName}>{ex.name}</Text>
                      <Text style={s.exDesc}>{ex.desc}</Text>
                    </View>
                    {selected.id === ex.id && <Text style={[s.selectedBadge, { color: col }]}>✓</Text>}
                  </TouchableOpacity>
                );
              })}

              {/* Custom exercises */}
              {customExercises.map((ex) => {
                const col = ex.color ?? C.accent;
                return (
                  <TouchableOpacity
                    key={ex.id}
                    style={[s.exCard, selected.id === ex.id && { borderColor: col, borderWidth: 2 }]}
                    onPress={() => setSelected(ex)}
                    activeOpacity={0.8}
                  >
                    <View style={[s.exDot, { backgroundColor: col }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.exName}>{ex.name}</Text>
                      <Text style={s.exDesc}>{ex.desc}</Text>
                    </View>
                    <View style={s.customBadgeRow}>
                      {selected.id === ex.id && <Text style={[s.selectedBadge, { color: col }]}>✓</Text>}
                      <TouchableOpacity onPress={() => deleteCustom(ex.id)} style={s.deleteBtn}>
                        <Ionicons name="trash-sharp" color={C.muted} size={15} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Editor or + button */}
            {draft ? (
              <CustomEditorCard
                draft={draft}
                onChange={setDraft}
                onSave={saveCustom}
                onDiscard={discardDraft}
                C={C}
              />
            ) : (
              <TouchableOpacity style={s.addCustomBtn} onPress={openEditor} activeOpacity={0.8}>
                <Ionicons name="add" color={C.accent} size={16} />
                <Text style={s.addCustomText}>Create custom pattern</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        <View style={s.circleContainer}>
          <Animated.View style={[s.outerRing, { borderColor: accentColor, transform: [{ scale: scaleAnim }], opacity: opacityAnim }]} />
          <Animated.View style={[s.circle, { backgroundColor: accentColor + "33", transform: [{ scale: scaleAnim }] }]}>
            <TouchableOpacity
              style={[s.innerCircle, { backgroundColor: accentColor + "88" }]}
              onPress={active ? stopExercise : startExercise}
              activeOpacity={0.75}
            >
              {active ? (
                <>
                  <Text style={s.phaseLabel}>{phase.label}</Text>
                  <Text style={s.countdownNum}>{countdown}</Text>
                </>
              ) : (
                <>
                  <Text style={s.readyText}>Tap</Text>
                  <Text style={s.readySub}>to begin</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>

        {active && (
          <View style={s.phaseRow}>
            {selected.phases.map((p, i) => (
              <View key={i} style={[s.phasePill, i === phaseIdx && { backgroundColor: accentColor }]}>
                <Text style={[s.phasePillText, i === phaseIdx && { color: "#fff" }]}>{p.label}</Text>
              </View>
            ))}
          </View>
        )}

        {active && elapsed > 0 && (
          <Text style={s.elapsed}>
            {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")} elapsed
          </Text>
        )}

        {active && (
          <TouchableOpacity
            style={[s.btn, { backgroundColor: C.coral + "22" }]}
            onPress={stopExercise}
            activeOpacity={0.85}
          >
            <Text style={[s.btnText, { color: C.coral }]}>Stop Session</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
function makeStyles(C: any) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    scroll: { flex: 1, paddingHorizontal: 20 },
    topRow: { flexDirection: "row", alignItems: "flex-start", marginTop: 16, marginBottom: 20 },
    gearBtn: { width: 42, height: 42, borderRadius: 13, backgroundColor: C.surface2, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: C.border },
    title: { color: C.text, fontSize: 26, fontWeight: "800", marginBottom: 2 },
    sub: { color: C.sub, fontSize: 13 },
    exerciseList: { gap: 10, marginBottom: 12 },
    exCard: { backgroundColor: C.surface, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: C.border },
    exDot: { width: 10, height: 10, borderRadius: 5 },
    exName: { color: C.text, fontSize: 15, fontWeight: "700" },
    exDesc: { color: C.sub, fontSize: 12, marginTop: 2 },
    selectedBadge: { fontSize: 18, fontWeight: "800" },
    customBadgeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    deleteBtn: { padding: 4 },
    addCustomBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 14, borderWidth: 1.5, borderColor: C.accent + "55", borderStyle: "dashed", paddingVertical: 14, paddingHorizontal: 16, marginBottom: 24, justifyContent: "center" },
    addCustomText: { color: C.accent, fontSize: 14, fontWeight: "700" },
    circleContainer: { alignItems: "center", justifyContent: "center", height: 210, marginBottom: 16 },
    outerRing: { position: "absolute", width: 175, height: 175, borderRadius: 88, borderWidth: 2 },
    circle: { width: 145, height: 145, borderRadius: 73, alignItems: "center", justifyContent: "center" },
    innerCircle: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center" },
    phaseLabel: { color: "#fff", fontSize: 14, fontWeight: "600" },
    countdownNum: { color: "#fff", fontSize: 36, fontWeight: "800" },
    readyText: { color: "#fff", fontSize: 16, fontWeight: "700" },
    readySub: { color: "#ffffff99", fontSize: 11, fontWeight: "500", marginTop: 2 },
    phaseRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" },
    phasePill: { backgroundColor: C.surface2, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
    phasePillText: { color: C.sub, fontSize: 12, fontWeight: "600" },
    elapsed: { color: C.muted, fontSize: 14, textAlign: "center", marginBottom: 20 },
    btn: { borderRadius: 16, paddingVertical: 18, alignItems: "center", marginTop: 8 },
    btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  });
}

function editorStyles(C: any) {
  return StyleSheet.create({
    card: { backgroundColor: C.surface, borderRadius: 20, padding: 18, borderWidth: 2, marginBottom: 20 },
    label: { color: C.sub, fontSize: 11, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 },
    input: { backgroundColor: C.surface2, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: C.text, fontSize: 15, fontWeight: "600", borderWidth: 1, borderColor: C.border },
    colorRow: { flexDirection: "row", gap: 10 },
    colorDot: { width: 28, height: 28, borderRadius: 14 },
    colorDotSelected: { borderWidth: 3, borderColor: "#fff", transform: [{ scale: 1.15 }] },
    phaseRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
    labelChip: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface2 },
    labelChipText: { color: C.sub, fontSize: 11, fontWeight: "600" },
    stepper: { flexDirection: "row", alignItems: "center", backgroundColor: C.surface2, borderRadius: 10, borderWidth: 1, borderColor: C.border, overflow: "hidden" },
    stepBtn: { paddingHorizontal: 8, paddingVertical: 8 },
    stepVal: { color: C.text, fontSize: 13, fontWeight: "700", minWidth: 30, textAlign: "center" },
    removeBtn: { padding: 6 },
    addPhaseBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderStyle: "dashed", borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, marginTop: 4, alignSelf: "flex-start" },
    addPhaseText: { fontSize: 12, fontWeight: "700" },
    actions: { flexDirection: "row", gap: 10, marginTop: 18 },
    discardBtn: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center", backgroundColor: C.surface2 },
    discardText: { color: C.sub, fontSize: 14, fontWeight: "700" },
    saveBtn: { flex: 2, borderRadius: 12, paddingVertical: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 },
    saveText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  });
}
