import { useState, useEffect } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, RefreshControl
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import api from "../../utils/api";

export default function VendorDeals() {
  const router = useRouter();
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchDeals(); }, []);

  const fetchDeals = async () => {
    try {
      const data = await api.get("/api/vendor/deals");
      setDeals(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  const toggleDeal = async (deal: any) => {
    try {
      await api.put(`/api/vendor/deals/${deal.deal_id}`, { is_active: !deal.is_active });
      fetchDeals();
    } catch {
      Alert.alert("Error", "Could not update deal");
    }
  };

  const deleteDeal = (dealId: string) => {
    Alert.alert("Delete Deal", "Remove this deal?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          await api.delete(`/api/vendor/deals/${dealId}`);
          fetchDeals();
        }
      }
    ]);
  };

  if (loading) {
    return <SafeAreaView style={styles.safe}><View style={styles.center}><ActivityIndicator color="#3B82F6" /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>My Deals</Text>
        <TouchableOpacity testID="create-deal-btn" style={styles.createBtn} onPress={() => router.push("/(vendor)/create-deal")}>
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.createBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      {deals.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📢</Text>
          <Text style={styles.emptyTitle}>No deals yet</Text>
          <Text style={styles.emptyText}>Create your first deal to attract nearby customers!</Text>
          <TouchableOpacity testID="create-first-deal-btn" style={styles.createFirstBtn} onPress={() => router.push("/(vendor)/create-deal")}>
            <Text style={styles.createFirstBtnText}>Create First Deal</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={deals}
          keyExtractor={(item) => item.deal_id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDeals(); }} tintColor="#3B82F6" />}
          renderItem={({ item }) => (
            <View testID={`deal-${item.deal_id}`} style={[styles.dealCard, !item.is_active && styles.dealCardInactive]}>
              <View style={styles.dealTop}>
                <View style={[styles.typeBadge, { backgroundColor: item.type === "slow_hour" ? "rgba(16,185,129,0.15)" : "rgba(255,87,34,0.15)" }]}>
                  <Text style={[styles.typeBadgeText, { color: item.type === "slow_hour" ? "#10B981" : "#FF5722" }]}>
                    {item.type === "slow_hour" ? "⏰ Slow Hour" : "🔥 Clearance"}
                  </Text>
                </View>
                <View style={[styles.statusDot, { backgroundColor: item.is_active ? "#10B981" : "#64748B" }]}>
                  <Text style={styles.statusText}>{item.is_active ? "Live" : "Paused"}</Text>
                </View>
              </View>

              <Text style={styles.dealTitle}>{item.title}</Text>
              <Text style={styles.dealDesc} numberOfLines={2}>{item.description}</Text>

              <View style={styles.dealMeta}>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>{item.discount_percentage}% OFF</Text>
                  {item.type === "clearance" && <Text style={styles.discountSub}> (base)</Text>}
                </View>
                <Text style={styles.timeText}>
                  {item.start_time} – {item.end_time}
                </Text>
                <Text style={styles.radiusText}>📍 {item.radius_km} km</Text>
              </View>

              {item.type === "clearance" && item.closing_time && (
                <Text style={styles.closingInfo}>Closes at {item.closing_time} • Discount auto-increases</Text>
              )}

              <View style={styles.dealActions}>
                <TouchableOpacity
                  testID={`toggle-deal-${item.deal_id}`}
                  style={[styles.actionBtn, { backgroundColor: item.is_active ? "#1E3A5F" : "#10B981" }]}
                  onPress={() => toggleDeal(item)}
                >
                  <Ionicons name={item.is_active ? "pause" : "play"} size={14} color="#FFF" />
                  <Text style={styles.actionBtnText}>{item.is_active ? "Pause" : "Activate"}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID={`delete-deal-${item.deal_id}`}
                  style={[styles.actionBtn, { backgroundColor: "rgba(239,68,68,0.15)", borderWidth: 1, borderColor: "#EF4444" }]}
                  onPress={() => deleteDeal(item.deal_id)}
                >
                  <Ionicons name="trash-outline" size={14} color="#EF4444" />
                  <Text style={[styles.actionBtnText, { color: "#EF4444" }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0F172A" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: "#334155",
  },
  title: { fontSize: 22, fontWeight: "800", color: "#F8FAFC", letterSpacing: -0.5 },
  createBtn: {
    flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#3B82F6",
    borderRadius: 99, paddingHorizontal: 16, paddingVertical: 8,
  },
  createBtnText: { fontSize: 14, fontWeight: "700", color: "#FFF" },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#F8FAFC", marginBottom: 8 },
  emptyText: { fontSize: 14, color: "#94A3B8", textAlign: "center", marginBottom: 24 },
  createFirstBtn: { backgroundColor: "#3B82F6", borderRadius: 99, paddingHorizontal: 24, paddingVertical: 12 },
  createFirstBtnText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
  list: { padding: 16, paddingBottom: 32 },
  dealCard: {
    backgroundColor: "#1E293B", borderRadius: 14, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: "#334155",
  },
  dealCardInactive: { opacity: 0.6 },
  dealTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  typeBadgeText: { fontSize: 11, fontWeight: "700" },
  statusDot: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  statusText: { fontSize: 11, fontWeight: "700", color: "#FFF" },
  dealTitle: { fontSize: 17, fontWeight: "800", color: "#F8FAFC", marginBottom: 4, letterSpacing: -0.3 },
  dealDesc: { fontSize: 12, color: "#94A3B8", marginBottom: 12, lineHeight: 18 },
  dealMeta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  discountBadge: { backgroundColor: "#FF5722", borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4, flexDirection: "row" },
  discountText: { fontSize: 12, fontWeight: "800", color: "#FFF" },
  discountSub: { fontSize: 10, color: "rgba(255,255,255,0.8)" },
  timeText: { fontSize: 12, color: "#94A3B8", fontWeight: "600" },
  radiusText: { fontSize: 11, color: "#64748B" },
  closingInfo: { fontSize: 11, color: "#FF5722", marginBottom: 10 },
  dealActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  actionBtnText: { fontSize: 12, fontWeight: "700", color: "#FFF" },
});
