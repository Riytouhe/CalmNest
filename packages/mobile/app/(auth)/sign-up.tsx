import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Link } from "expo-router";
import { useState } from "react";
import { authClient, captureToken } from "../../lib/auth";

export default function SignUpScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    if (!name || !email || !password || !confirm) {
      setError("Please fill in all fields.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    setError("");
    const { error: err } = await authClient.signUp.email(
      { name, email, password },
      { onSuccess: captureToken }
    );
    setLoading(false);
    if (err) setError(err.message ?? "Sign up failed.");
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo / Brand */}
        <View style={styles.brandRow}>
          <Text style={styles.leaf}>🌿</Text>
          <Text style={styles.brand}>CalmNest</Text>
        </View>
        <Text style={styles.tagline}>Create your account</Text>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor="#666"
            autoCapitalize="words"
            autoCorrect={false}
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@email.com"
            placeholderTextColor="#666"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Min. 8 characters"
            placeholderTextColor="#666"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Re-enter password"
            placeholderTextColor="#666"
            secureTextEntry
            value={confirm}
            onChangeText={setConfirm}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSignUp}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Create Account</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/sign-in" asChild>
            <TouchableOpacity>
              <Text style={styles.link}>Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0D1117",
  },
  inner: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 60,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    gap: 8,
  },
  leaf: {
    fontSize: 32,
  },
  brand: {
    fontSize: 28,
    fontWeight: "700",
    color: "#E8F5E9",
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 15,
    color: "#8B9EB7",
    textAlign: "center",
    marginBottom: 36,
    letterSpacing: 0.3,
  },
  form: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    color: "#8B9EB7",
    marginBottom: 4,
    marginTop: 12,
    fontWeight: "500",
    letterSpacing: 0.4,
  },
  input: {
    backgroundColor: "#161B22",
    borderWidth: 1,
    borderColor: "#2A3441",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#E8F5E9",
    fontSize: 15,
  },
  error: {
    color: "#FF6B6B",
    fontSize: 13,
    marginTop: 8,
    textAlign: "center",
  },
  btn: {
    backgroundColor: "#4CAF82",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 24,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.3,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 32,
    alignItems: "center",
  },
  footerText: {
    color: "#8B9EB7",
    fontSize: 14,
  },
  link: {
    color: "#4CAF82",
    fontWeight: "600",
    fontSize: 14,
  },
});
