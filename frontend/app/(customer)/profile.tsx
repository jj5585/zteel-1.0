import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { useRouter } from "expo-router";

export default function CustomerProfile() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out", style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/auth/welcome");
        }
      }
    ]);
  };

  const initials = user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "U";

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>Customer</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          {[
            { icon: "receipt-outline", label: "Order History", onPress: () => router.push("/(customer)/orders") },
            { icon: "location-outline", label: "Saved Addresses", onPress: () => {} },
            { icon: "notifications-outline", label: "Notifications", onPress: () => {} },
          ].map((item) => (
            <TouchableOpacity key={item.label} style={styles.menuItem} onPress={item.onPress}>
              <Ionicons name={item.icon as any} size={20} color="#FF5722" />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Info</Text>
          {[
            { icon: "help-circle-outline", label: "Help & Support", onPress: () => {} },
            { icon: "shield-outline", label: "Privacy Policy", onPress: () => {} },
            { icon: "information-circle-outline", label: "About Zteeel v1.0", onPress: () => {} },
          ].map((item) => (
            <TouchableOpacity key={item.label} style={styles.menuItem} onPress={item.onPress}>
              <Ionicons name={item.icon as any} size={20} color="#64748B" />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity testID="logout-btn" style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8F9FA" },
  scroll: { paddingBottom: 32 },
  avatarContainer: {
    alignItems: "center", paddingVertical: 32, backgroundColor: "#FFFFFF",
    borderBottomWidth: 1, borderBottomColor: "#E2E8F0",
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: "#FF5722",
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: "900", color: "#FFF" },
  name: { fontSize: 22, fontWeight: "800", color: "#121212", letterSpacing: -0.5 },
  email: { fontSize: 14, color: "#64748B", marginTop: 4 },
  roleBadge: {
    marginTop: 8, backgroundColor: "#FFF3E0", paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 99, borderWidth: 1, borderColor: "#FFD0B5",
  },
  roleText: { fontSize: 12, fontWeight: "700", color: "#FF5722" },
  section: { marginTop: 20, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 11, fontWeight: "700", color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, paddingLeft: 4 },
  menuItem: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF",
    borderRadius: 12, padding: 16, marginBottom: 8, gap: 12,
    borderWidth: 1, borderColor: "#E2E8F0",
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: "600", color: "#121212" },
  logoutBtn: {
    margin: 16, marginTop: 24, flexDirection: "row", alignItems: "center",
    justifyContent: "center", backgroundColor: "#FEF2F2", borderRadius: 12,
    padding: 16, gap: 8, borderWidth: 1, borderColor: "#FECACA",
  },
  logoutText: { fontSize: 15, fontWeight: "700", color: "#EF4444" },
});
