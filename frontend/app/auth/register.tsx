import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";

export default function Register() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"customer" | "vendor">("customer");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert("Error", "Please fill all required fields");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await register(email.trim().toLowerCase(), password, name.trim(), phone.trim(), role);
    } catch (e: any) {
      Alert.alert("Registration Failed", e.message || "Please try again");
    } finally {
      setLoading(false);
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

          <Text style={styles.title}>Join Zteeel</Text>
          <Text style={styles.subtitle}>Create an account to start saving</Text>

          {/* Role Toggle */}
          <View style={styles.roleContainer}>
            <Text style={styles.roleLabel}>I am a...</Text>
            <View style={styles.roleToggle}>
              <TouchableOpacity
                testID="role-customer"
                style={[styles.roleCard, role === "customer" && styles.roleCardActive]}
                onPress={() => setRole("customer")}
              >
                <Text style={styles.roleEmoji}>🛍️</Text>
                <Text style={[styles.roleCardTitle, role === "customer" && styles.roleCardTitleActive]}>Customer</Text>
                <Text style={styles.roleCardSub}>Find deals near me</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="role-vendor"
                style={[styles.roleCard, role === "vendor" && styles.roleCardActive]}
                onPress={() => setRole("vendor")}
              >
                <Text style={styles.roleEmoji}>🏪</Text>
                <Text style={[styles.roleCardTitle, role === "vendor" && styles.roleCardTitleActive]}>Vendor</Text>
                <Text style={styles.roleCardSub}>Post deals & manage orders</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Inputs */}
          <TextInput
            testID="name-input"
            style={styles.input}
            placeholder="Full Name *"
            placeholderTextColor="#64748B"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            testID="email-input"
            style={styles.input}
            placeholder="Email Address *"
            placeholderTextColor="#64748B"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            testID="phone-input"
            style={styles.input}
            placeholder="Phone Number (Optional)"
            placeholderTextColor="#64748B"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
          <TextInput
            testID="password-input"
            style={styles.input}
            placeholder="Password * (min 6 chars)"
            placeholderTextColor="#64748B"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity testID="register-btn" style={styles.primaryBtn} onPress={handleRegister} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.primaryBtnText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity testID="login-link" onPress={() => router.push("/auth/login")}>
              <Text style={styles.linkText}>Sign In</Text>
            </TouchableOpacity>
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
  subtitle: { fontSize: 16, color: "#94A3B8", marginBottom: 28 },
  roleContainer: { marginBottom: 24 },
  roleLabel: { fontSize: 14, fontWeight: "700", color: "#94A3B8", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 },
  roleToggle: { flexDirection: "row", gap: 12 },
  roleCard: {
    flex: 1, backgroundColor: "#1E293B", borderRadius: 16, padding: 16,
    borderWidth: 2, borderColor: "#334155", alignItems: "center",
  },
  roleCardActive: { borderColor: "#FF5722", backgroundColor: "rgba(255,87,34,0.1)" },
  roleEmoji: { fontSize: 28, marginBottom: 8 },
  roleCardTitle: { fontSize: 16, fontWeight: "700", color: "#94A3B8", marginBottom: 4 },
  roleCardTitleActive: { color: "#FF5722" },
  roleCardSub: { fontSize: 11, color: "#64748B", textAlign: "center" },
  input: {
    height: 56, backgroundColor: "#1E293B", borderRadius: 12,
    paddingHorizontal: 16, fontSize: 16, color: "#F8FAFC",
    borderWidth: 1, borderColor: "#334155", marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: "#FF5722", borderRadius: 99, height: 56,
    alignItems: "center", justifyContent: "center", marginTop: 8, marginBottom: 24,
  },
  primaryBtnText: { fontSize: 16, fontWeight: "700", color: "#FFF" },
  footer: { flexDirection: "row", justifyContent: "center" },
  footerText: { color: "#94A3B8", fontSize: 14 },
  linkText: { color: "#FF5722", fontSize: 14, fontWeight: "700" },
});
