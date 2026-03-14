import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import * as WebBrowser from "expo-web-browser";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "";

export default function Login() {
  const router = useRouter();
  const { login, googleAuth } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"customer" | "vendor">("customer");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      // Navigation handled by index.tsx auth check
    } catch (e: any) {
      Alert.alert("Login Failed", e.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      // Use window.location.origin so the redirect works across all environments (preview, production)
      const origin = typeof window !== "undefined" ? window.location.origin : BACKEND_URL;
      const redirectUrl = origin + "/auth/callback";
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
      if (Platform.OS === "web") {
        if (typeof window !== "undefined") {
          window.location.href = authUrl;
        }
      } else {
        await WebBrowser.openBrowserAsync(authUrl);
      }
    } catch (e: any) {
      Alert.alert("Error", "Google sign-in failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity testID="back-btn" onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backText}>←</Text>
            </TouchableOpacity>
            <View style={styles.logoMini}>
              <Text style={styles.logoChar}>Z</Text>
            </View>
          </View>

          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to find deals near you</Text>

          {/* Role Toggle */}
          <View style={styles.roleToggle}>
            <TouchableOpacity
              testID="role-customer"
              style={[styles.roleBtn, role === "customer" && styles.roleBtnActive]}
              onPress={() => setRole("customer")}
            >
              <Text style={[styles.roleBtnText, role === "customer" && styles.roleBtnTextActive]}>Customer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="role-vendor"
              style={[styles.roleBtn, role === "vendor" && styles.roleBtnActive]}
              onPress={() => setRole("vendor")}
            >
              <Text style={[styles.roleBtnText, role === "vendor" && styles.roleBtnTextActive]}>Vendor</Text>
            </TouchableOpacity>
          </View>

          {/* Inputs */}
          <TextInput
            testID="email-input"
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor="#64748B"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            testID="password-input"
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#64748B"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {/* Login Button */}
          <TouchableOpacity testID="login-btn" style={styles.primaryBtn} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>Sign In</Text>}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google */}
          <TouchableOpacity testID="google-login-btn" style={styles.googleBtn} onPress={handleGoogleLogin} disabled={googleLoading}>
            {googleLoading ? (
              <ActivityIndicator color="#121212" />
            ) : (
              <>
                <Text style={styles.googleIcon}>G</Text>
                <Text style={styles.googleBtnText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Register link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity testID="register-link" onPress={() => router.push("/auth/register")}>
              <Text style={styles.linkText}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          {/* Demo accounts */}
          <View style={styles.demoBox}>
            <Text style={styles.demoTitle}>Demo Vendor Accounts</Text>
            <Text style={styles.demoText}>maharaja@zteeel.com / vendor123</Text>
            <Text style={styles.demoText}>freshjuice@zteeel.com / vendor123</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0F172A" },
  scroll: { flexGrow: 1, padding: 24 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 32 },
  backBtn: { padding: 8, marginRight: 8 },
  backText: { fontSize: 24, color: "#F8FAFC" },
  logoMini: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#FF5722", alignItems: "center", justifyContent: "center",
  },
  logoChar: { fontSize: 20, fontWeight: "900", color: "#FFF" },
  title: { fontSize: 32, fontWeight: "800", color: "#F8FAFC", marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: "#94A3B8", marginBottom: 32 },
  roleToggle: {
    flexDirection: "row", backgroundColor: "#1E293B", borderRadius: 12,
    padding: 4, marginBottom: 24, gap: 4,
  },
  roleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  roleBtnActive: { backgroundColor: "#FF5722" },
  roleBtnText: { fontSize: 14, fontWeight: "600", color: "#94A3B8" },
  roleBtnTextActive: { color: "#FFF" },
  input: {
    height: 56, backgroundColor: "#1E293B", borderRadius: 12,
    paddingHorizontal: 16, fontSize: 16, color: "#F8FAFC",
    borderWidth: 1, borderColor: "#334155", marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: "#FF5722", borderRadius: 99, height: 56,
    alignItems: "center", justifyContent: "center", marginTop: 8,
  },
  primaryBtnText: { fontSize: 16, fontWeight: "700", color: "#FFF" },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 24, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#334155" },
  dividerText: { color: "#64748B", fontSize: 14 },
  googleBtn: {
    backgroundColor: "#F8FAFC", borderRadius: 99, height: 56,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12,
  },
  googleIcon: { fontSize: 20, fontWeight: "900", color: "#EA4335" },
  googleBtnText: { fontSize: 16, fontWeight: "600", color: "#121212" },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  footerText: { color: "#94A3B8", fontSize: 14 },
  linkText: { color: "#FF5722", fontSize: 14, fontWeight: "700" },
  demoBox: {
    marginTop: 24, backgroundColor: "#1E293B", borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: "#334155",
  },
  demoTitle: { color: "#94A3B8", fontSize: 12, fontWeight: "700", marginBottom: 8, textTransform: "uppercase" },
  demoText: { color: "#64748B", fontSize: 12, marginBottom: 4 },
});
