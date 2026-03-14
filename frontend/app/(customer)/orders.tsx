import { useState, useEffect } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import api from "../../utils/api";

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  pending: { color: "#92400E", bg: "#FFF8E7", label: "Pending" },
  confirmed: { color: "#1E3A5F", bg: "#EFF6FF", label: "Confirmed" },
  preparing: { color: "#7C2D12", bg: "#FFF3E0", label: "Preparing" },
  ready: { color: "#065F46", bg: "#ECFDF5", label: "Ready" },
  delivered: { color: "#065F46", bg: "#DCFCE7", label: "Delivered ✓" },
  cancelled: { color: "#7F1D1D", bg: "#FEF2F2", label: "Cancelled" },
};

export default function OrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    try {
      const data = await api.get("/api/orders");
      setOrders(Array.isArray(data) ? data : []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchOrders(); };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    } catch { return ""; }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF5722" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>My Orders</Text>
        <Text style={styles.subtitle}>{orders.length} total orders</Text>
      </View>

      {orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🛍️</Text>
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptyText}>Start exploring deals and place your first order!</Text>
          <TouchableOpacity
            testID="explore-deals-btn"
            style={styles.exploreBtn}
            onPress={() => router.push("/(customer)")}
          >
            <Text style={styles.exploreBtnText}>Explore Deals</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.order_id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF5722" />}
          renderItem={({ item }) => {
            const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
            return (
              <View testID={`order-${item.order_id}`} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <View>
                    <Text style={styles.orderId}>#{item.order_id}</Text>
                    <Text style={styles.vendorName}>{item.vendor_name}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                    <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.orderItems}>
                  {(item.items || []).slice(0, 2).map((it: any, idx: number) => (
                    <Text key={idx} style={styles.itemText}>
                      {it.quantity}× {it.name}
                    </Text>
                  ))}
                  {(item.items || []).length > 2 && (
                    <Text style={styles.moreItems}>+{item.items.length - 2} more items</Text>
                  )}
                </View>

                <View style={styles.orderFooter}>
                  <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
                  <View style={styles.totalContainer}>
                    {item.discount > 0 && (
                      <Text style={styles.discountText}>-₹{item.discount.toFixed(0)}</Text>
                    )}
                    <Text style={styles.totalText}>₹{item.total?.toFixed(0)}</Text>
                  </View>
                </View>

                {item.payment_status === "paid" && (
                  <View style={styles.paidBadge}>
                    <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                    <Text style={styles.paidText}>Paid</Text>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8F9FA" },
  header: {
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: "#FFFFFF",
    borderBottomWidth: 1, borderBottomColor: "#E2E8F0",
  },
  title: { fontSize: 22, fontWeight: "800", color: "#121212", letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: "#64748B", marginTop: 2 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#121212", marginBottom: 8 },
  emptyText: { fontSize: 14, color: "#64748B", textAlign: "center", marginBottom: 24, lineHeight: 20 },
  exploreBtn: { backgroundColor: "#FF5722", borderRadius: 99, paddingHorizontal: 24, paddingVertical: 12 },
  exploreBtnText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
  list: { padding: 16, paddingBottom: 32 },
  orderCard: {
    backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: "#E2E8F0",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  orderId: { fontSize: 12, color: "#94A3B8", fontWeight: "600", marginBottom: 2 },
  vendorName: { fontSize: 16, fontWeight: "800", color: "#121212" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  statusText: { fontSize: 11, fontWeight: "700" },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 12 },
  orderItems: { gap: 3, marginBottom: 12 },
  itemText: { fontSize: 13, color: "#64748B" },
  moreItems: { fontSize: 12, color: "#94A3B8", fontStyle: "italic" },
  orderFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dateText: { fontSize: 12, color: "#94A3B8" },
  totalContainer: { flexDirection: "row", alignItems: "center", gap: 6 },
  discountText: { fontSize: 12, color: "#10B981", fontWeight: "600" },
  totalText: { fontSize: 18, fontWeight: "800", color: "#121212" },
  paidBadge: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  paidText: { fontSize: 11, color: "#10B981", fontWeight: "700" },
});
