import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { useRouter } from "expo-router";

export default function VendorProfile() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out", style: "destructive",
        onPress: async () => { await logout(); router.replace("/auth/welcome"); }
      }
    ]);
  };

  const initials = user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "V";

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>Vendor</Text>
          </View>
        </View>

        <View style={styles.section}>
          {[
            { icon: "storefront-outline", label: "Edit Store Profile", onPress: () => router.push("/(vendor)/setup") },
            { icon: "notifications-outline", label: "Notification Settings", onPress: () => {} },
            { icon: "help-circle-outline", label: "Vendor Support", onPress: () => {} },
            { icon: "document-text-outline", label: "Terms & Conditions", onPress: () => {} },
          ].map((item) => (
            <TouchableOpacity key={item.label} style={styles.menuItem} onPress={item.onPress}>
              <Ionicons name={item.icon as any} size={20} color="#3B82F6" />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color="#64748B" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity testID="vendor-logout-btn" style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0F172A" },
  scroll: { paddingBottom: 32 },
  avatarContainer: { alignItems: "center", paddingVertical: 32, borderBottomWidth: 1, borderBottomColor: "#334155" },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#3B82F6", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  avatarText: { fontSize: 28, fontWeight: "900", color: "#FFF" },
  name: { fontSize: 22, fontWeight: "800", color: "#F8FAFC" },
  email: { fontSize: 14, color: "#64748B", marginTop: 4 },
  roleBadge: { marginTop: 8, backgroundColor: "rgba(59,130,246,0.2)", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 99, borderWidth: 1, borderColor: "#3B82F6" },
  roleText: { fontSize: 12, fontWeight: "700", color: "#3B82F6" },
  section: { marginTop: 20, paddingHorizontal: 16 },
  menuItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#1E293B", borderRadius: 12, padding: 16, marginBottom: 8, gap: 12, borderWidth: 1, borderColor: "#334155" },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: "600", color: "#F8FAFC" },
  logoutBtn: { margin: 16, marginTop: 24, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(239,68,68,0.1)", borderRadius: 12, padding: 16, gap: 8, borderWidth: 1, borderColor: "#EF4444" },
  logoutText: { fontSize: 15, fontWeight: "700", color: "#EF4444" },
});
