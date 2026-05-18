import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../lib/ThemeContext";
import { authClient, clearToken } from "../lib/auth";

type ModalType = "name" | "email" | "password" | "delete" | null;

export default function AccountSettingsScreen() {
  const router = useRouter();
  const { C } = useTheme();
  const s = makeStyles(C);

  const { data: session, isPending, refetch } = authClient.useSession();
  const user = session?.user;

  const [modal, setModal] = useState<ModalType>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Edit name
  const [name, setName] = useState("");
  // Change email
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  // Change password
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  // Delete
  const [deletePw, setDeletePw] = useState("");

  function openModal(type: ModalType) {
    setError("");
    setName(user?.name ?? "");
    setNewEmail("");
    setEmailPassword("");
    setCurrentPw("");
    setNewPw("");
    setConfirmPw("");
    setDeletePw("");
    setModal(type);
  }

  function closeModal() {
    setModal(null);
    setError("");
  }

  // ── Pick avatar ──────────────────────────────────────────────
  async function pickAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow photo library access to change your avatar.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    // Avatar upload can be wired to storage later — show toast for now
    Alert.alert("Coming soon", "Avatar upload will be available once storage is configured.");
  }

  // ── Save name ────────────────────────────────────────────────
  async function saveName() {
    if (!name.trim()) { setError("Name can't be empty."); return; }
    setLoading(true); setError("");
    const { error: err } = await authClient.updateUser({ name: name.trim() });
    setLoading(false);
    if (err) { setError(err.message ?? "Failed to update name."); return; }
    await refetch();
    closeModal();
  }

  // ── Change email ─────────────────────────────────────────────
  async function saveEmail() {
    if (!newEmail.trim()) { setError("Enter a new email."); return; }
    if (!emailPassword) { setError("Enter your current password."); return; }
    setLoading(true); setError("");
    const { error: err } = await authClient.changeEmail({
      newEmail: newEmail.trim(),
    });
    setLoading(false);
    if (err) { setError(err.message ?? "Failed to change email."); return; }
    await refetch();
    closeModal();
  }

  // ── Change password ──────────────────────────────────────────
  async function savePassword() {
    if (!currentPw) { setError("Enter your current password."); return; }
    if (newPw.length < 8) { setError("New password must be at least 8 characters."); return; }
    if (newPw !== confirmPw) { setError("Passwords don't match."); return; }
    setLoading(true); setError("");
    const { error: err } = await authClient.changePassword({
      currentPassword: currentPw,
      newPassword: newPw,
      revokeOtherSessions: true,
    });
    setLoading(false);
    if (err) { setError(err.message ?? "Failed to change password."); return; }
    closeModal();
    Alert.alert("Done", "Password updated. You've been signed out of other devices.");
  }

  // ── Delete account ───────────────────────────────────────────
  async function deleteAccount() {
    if (!deletePw) { setError("Enter your password to confirm."); return; }
    setLoading(true); setError("");
    const { error: err } = await authClient.deleteUser({ password: deletePw });
    setLoading(false);
    if (err) { setError(err.message ?? "Failed to delete account."); return; }
    await clearToken();
    router.replace("/(auth)/sign-in");
  }

  // ── Sign out ─────────────────────────────────────────────────
  async function signOut() {
    await authClient.signOut();
    await clearToken();
    router.replace("/(auth)/sign-in");
  }

  if (isPending) {
    return (
      <View style={[s.safe, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={C.accent} />
      </View>
    );
  }

  const initials = user?.name
    ? user.name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" color={C.text} size={22} />
        </TouchableOpacity>
        <Text style={s.title}>Account</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }}>

        {/* Avatar + name */}
        <View style={s.avatarSection}>
          <TouchableOpacity onPress={pickAvatar} activeOpacity={0.8}>
            {user?.image ? (
              <Image source={{ uri: user.image }} style={s.avatar} />
            ) : (
              <View style={s.avatarPlaceholder}>
                <Text style={s.avatarInitials}>{initials}</Text>
              </View>
            )}
            <View style={s.avatarBadge}>
              <Ionicons name="camera" color="#fff" size={13} />
            </View>
          </TouchableOpacity>
          <Text style={s.avatarName}>{user?.name ?? "—"}</Text>
          <Text style={s.avatarEmail}>{user?.email ?? "—"}</Text>
        </View>

        {/* Profile section */}
        <Text style={s.sectionLabel}>Profile</Text>
        <View style={s.card}>
          <SettingRow
            icon="person-outline"
            iconColor={C.accent}
            label="Display Name"
            value={user?.name}
            onPress={() => openModal("name")}
            C={C}
          />
          <Divider C={C} />
          <SettingRow
            icon="mail-outline"
            iconColor={C.teal}
            label="Email"
            value={user?.email}
            onPress={() => openModal("email")}
            C={C}
          />
        </View>

        {/* Security section */}
        <Text style={s.sectionLabel}>Security</Text>
        <View style={s.card}>
          <SettingRow
            icon="lock-closed-outline"
            iconColor="#F59E0B"
            label="Change Password"
            onPress={() => openModal("password")}
            C={C}
          />
        </View>

        {/* Donation */}
        <TouchableOpacity
          style={s.donateBtn}
          activeOpacity={0.85}
          onPress={() => Linking.openURL("https://ko-fi.com/s/573a950e6c")}
        >
          <Text style={s.donateBtnEmoji}>☕</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.donateBtnTitle}>Support CalmNest</Text>
            <Text style={s.donateBtnSub}>Buy me a coffee on Ko-fi</Text>
          </View>
          <Ionicons name="heart" color="#FF6B6B" size={18} />
        </TouchableOpacity>

        {/* Danger zone */}
        <Text style={s.sectionLabel}>Account</Text>
        <View style={s.card}>
          <SettingRow
            icon="log-out-outline"
            iconColor={C.coral}
            label="Sign Out"
            onPress={signOut}
            danger
            C={C}
          />
          <Divider C={C} />
          <SettingRow
            icon="trash-outline"
            iconColor="#EF4444"
            label="Delete Account"
            onPress={() => openModal("delete")}
            danger
            C={C}
          />
        </View>

      </ScrollView>

      {/* ── Edit Name Modal ── */}
      <BottomModal visible={modal === "name"} onClose={closeModal} title="Edit Name" C={C}>
        <Text style={s.inputLabel}>Name</Text>
        <TextInput
          style={s.input}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={C.muted}
          autoCapitalize="words"
        />
        {error ? <Text style={s.error}>{error}</Text> : null}
        <ModalBtn label="Save" onPress={saveName} loading={loading} C={C} />
      </BottomModal>

      {/* ── Change Email Modal ── */}
      <BottomModal visible={modal === "email"} onClose={closeModal} title="Change Email" C={C}>
        <Text style={s.inputLabel}>New Email</Text>
        <TextInput
          style={s.input}
          value={newEmail}
          onChangeText={setNewEmail}
          placeholder="new@email.com"
          placeholderTextColor={C.muted}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Text style={s.inputLabel}>Current Password</Text>
        <PasswordInput value={emailPassword} onChangeText={setEmailPassword} placeholder="••••••••" C={C} s={s} />
        {error ? <Text style={s.error}>{error}</Text> : null}
        <ModalBtn label="Update Email" onPress={saveEmail} loading={loading} C={C} />
      </BottomModal>

      {/* ── Change Password Modal ── */}
      <BottomModal visible={modal === "password"} onClose={closeModal} title="Change Password" C={C}>
        <Text style={s.inputLabel}>Current Password</Text>
        <PasswordInput value={currentPw} onChangeText={setCurrentPw} placeholder="••••••••" C={C} s={s} />
        <Text style={s.inputLabel}>New Password</Text>
        <PasswordInput value={newPw} onChangeText={setNewPw} placeholder="Min. 8 characters" C={C} s={s} />
        <Text style={s.inputLabel}>Confirm New Password</Text>
        <PasswordInput value={confirmPw} onChangeText={setConfirmPw} placeholder="Re-enter new password" C={C} s={s} />
        {error ? <Text style={s.error}>{error}</Text> : null}
        <ModalBtn label="Update Password" onPress={savePassword} loading={loading} C={C} />
      </BottomModal>

      {/* ── Delete Account Modal ── */}
      <BottomModal visible={modal === "delete"} onClose={closeModal} title="Delete Account" C={C}>
        <Text style={[s.inputLabel, { color: "#EF4444", marginBottom: 12 }]}>
          This will permanently delete your account and all data. This cannot be undone.
        </Text>
        <Text style={s.inputLabel}>Enter your password to confirm</Text>
        <PasswordInput value={deletePw} onChangeText={setDeletePw} placeholder="••••••••" C={C} s={s} style={{ borderColor: "#EF444444" }} />
        {error ? <Text style={s.error}>{error}</Text> : null}
        <ModalBtn label="Delete My Account" onPress={deleteAccount} loading={loading} C={C} danger />
      </BottomModal>

    </SafeAreaView>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function SettingRow({ icon, iconColor, label, value, onPress, danger, C }: any) {
  return (
    <TouchableOpacity style={rowStyles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[rowStyles.iconWrap, { backgroundColor: iconColor + "22" }]}>
        <Ionicons name={icon} color={iconColor} size={18} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[rowStyles.label, danger && { color: iconColor }]}>{label}</Text>
        {value ? <Text style={[rowStyles.value, { color: C.sub }]}>{value}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" color={C.muted} size={16} />
    </TouchableOpacity>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  label: { fontSize: 15, fontWeight: "600", color: "#E8F5E9" },
  value: { fontSize: 12, marginTop: 1 },
});

function Divider({ C }: any) {
  return <View style={{ height: 1, backgroundColor: C.border, marginLeft: 64 }} />;
}

function BottomModal({ visible, onClose, title, children, C }: any) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableOpacity style={modalStyles.overlay} onPress={onClose} activeOpacity={1} />
        <View style={[modalStyles.sheet, { backgroundColor: C.surface }]}>
          <View style={modalStyles.handle} />
          <View style={modalStyles.titleRow}>
            <Text style={[modalStyles.title, { color: C.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" color={C.muted} size={22} />
            </TouchableOpacity>
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "#00000088" },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#444",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: { fontSize: 18, fontWeight: "700" },
});

function PasswordInput({ value, onChangeText, placeholder, C, s, style }: any) {
  const [show, setShow] = useState(false);
  return (
    <View style={{ position: "relative", justifyContent: "center", marginBottom: 0 }}>
      <TextInput
        style={[s.input, style]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.muted}
        secureTextEntry={!show}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TouchableOpacity
        onPress={() => setShow(v => !v)}
        style={{ position: "absolute", right: 12, padding: 4 }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name={show ? "eye-outline" : "eye-off-outline"} size={20} color={C.muted} />
      </TouchableOpacity>
    </View>
  );
}

function ModalBtn({ label, onPress, loading, C, danger }: any) {
  return (
    <TouchableOpacity
      style={[
        btnStyles.btn,
        { backgroundColor: danger ? "#EF4444" : C.accent },
        loading && btnStyles.disabled,
      ]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.85}
    >
      {loading
        ? <ActivityIndicator color="#fff" />
        : <Text style={btnStyles.label}>{label}</Text>
      }
    </TouchableOpacity>
  );
}

const btnStyles = StyleSheet.create({
  btn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  disabled: { opacity: 0.6 },
  label: { color: "#fff", fontWeight: "700", fontSize: 15 },
});

function makeStyles(C: any) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: C.surface2,
      justifyContent: "center",
      alignItems: "center",
    },
    title: { color: C.text, fontSize: 18, fontWeight: "700" },
    scroll: { flex: 1, paddingHorizontal: 20 },
    avatarSection: {
      alignItems: "center",
      paddingVertical: 28,
    },
    avatar: {
      width: 84,
      height: 84,
      borderRadius: 42,
    },
    avatarPlaceholder: {
      width: 84,
      height: 84,
      borderRadius: 42,
      backgroundColor: C.accent + "33",
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 2,
      borderColor: C.accent + "55",
    },
    avatarInitials: {
      color: C.accent,
      fontSize: 28,
      fontWeight: "700",
    },
    avatarBadge: {
      position: "absolute",
      bottom: 0,
      right: 0,
      backgroundColor: C.accent,
      width: 26,
      height: 26,
      borderRadius: 13,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 2,
      borderColor: C.bg,
    },
    avatarName: {
      color: C.text,
      fontSize: 20,
      fontWeight: "700",
      marginTop: 12,
    },
    avatarEmail: {
      color: C.sub,
      fontSize: 13,
      marginTop: 4,
    },
    donateBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: "#FF6B6B11",
      borderWidth: 1,
      borderColor: "#FF6B6B44",
      borderRadius: 18,
      padding: 16,
      marginTop: 8,
      marginBottom: 4,
    },
    donateBtnEmoji: { fontSize: 24 },
    donateBtnTitle: { color: C.text, fontSize: 15, fontWeight: "700" },
    donateBtnSub: { color: C.sub, fontSize: 12, marginTop: 1 },
    sectionLabel: {
      color: C.muted,
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 1.2,
      marginTop: 20,
      marginBottom: 8,
    },
    card: {
      backgroundColor: C.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: C.border,
      overflow: "hidden",
    },
    inputLabel: {
      color: C.sub,
      fontSize: 12,
      fontWeight: "600",
      marginBottom: 6,
      marginTop: 8,
      letterSpacing: 0.4,
    },
    input: {
      backgroundColor: C.bg,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: C.text,
      fontSize: 15,
    },
    error: {
      color: "#EF4444",
      fontSize: 13,
      marginTop: 8,
      textAlign: "center",
    },
  });
}
