import { useState, useEffect } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, RefreshControl
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import api from "../../utils/api";

const NEXT_STATUS: Record<string, string> = {
  pending: "confirmed",
  confirmed: "preparing",
  preparing: "ready",
  ready: "delivered",
};

const STATUS_CONFIG: Record<string, { color: string; label: string; nextLabel: string }> = {
  pending: { color: "#F59E0B", label: "New Order", nextLabel: "Accept" },
  confirmed: { color: "#3B82F6", label: "Confirmed", nextLabel: "Start Preparing" },
  preparing: { color: "#8B5CF6", label: "Preparing", nextLabel: "Mark Ready" },
  ready: { color: "#10B981", label: "Ready for Pickup", nextLabel: "Mark Delivered" },
  delivered: { color: "#10B981", label: "Delivered", nextLabel: "" },
  cancelled: { color: "#EF4444", label: "Cancelled", nextLabel: "" },
};

export default function VendorOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"active" | "all">("active");

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    try {
      const data = await api.get("/api/vendor/orders");
      setOrders(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  const updateStatus = async (orderId: string, status: string) => {
    try {
      await api.put(`/api/vendor/orders/${orderId}`, { status });
      fetchOrders();
    } catch {
      Alert.alert("Error", "Could not update order status");
    }
  };

  const cancelOrder = (orderId: string) => {
    Alert.alert("Cancel Order", "Cancel this order?", [
      { text: "No", style: "cancel" },
      { text: "Yes, Cancel", style: "destructive", onPress: () => updateStatus(orderId, "cancelled") }
    ]);
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    } catch { return ""; }
  };

  const filtered = filter === "active"
    ? orders.filter((o) => !["delivered", "cancelled"].includes(o.status))
    : orders;

  if (loading) {
    return <SafeAreaView style={styles.safe}><View style={styles.center}><ActivityIndicator color="#3B82F6" /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Orders</Text>
        <View style={styles.filterRow}>
          {(["active", "all"] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterTab, filter === f && styles.filterTabActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f === "active" ? `Active (${orders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length})` : "All"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {filtered.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>{filter === "active" ? "✅" : "📭"}</Text>
          <Text style={styles.emptyTitle}>{filter === "active" ? "All caught up!" : "No orders yet"}</Text>
          <Text style={styles.emptyText}>
            {filter === "active" ? "No pending orders right now." : "Orders will appear here once customers start buying."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.order_id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} tintColor="#3B82F6" />}
          renderItem={({ item }) => {
            const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
            const nextStatus = NEXT_STATUS[item.status];
            return (
              <View testID={`vendor-order-full-${item.order_id}`} style={styles.orderCard}>
                {/* Header */}
                <View style={styles.orderHeader}>
                  <View>
                    <Text style={styles.orderId}>#{item.order_id}</Text>
                    <Text style={styles.orderTime}>{formatTime(item.created_at)}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.orderTotal}>₹{Math.round(item.total)}</Text>
                    <View style={[styles.statusChip, { backgroundColor: config.color + "20" }]}>
                      <Text style={[styles.statusChipText, { color: config.color }]}>{config.label}</Text>
                    </View>
                  </View>
                </View>

                {/* Customer Info */}
                <View style={styles.customerSection}>
                  <Ionicons name="person-circle" size={18} color="#94A3B8" />
                  <View>
                    <Text style={styles.customerName}>{item.customer_name}</Text>
                    {item.customer_phone && (
                      <Text style={styles.customerPhone}>{item.customer_phone}</Text>
                    )}
                  </View>
                </View>

                {/* Payment Status */}
                {item.payment_status === "paid" && (
                  <View style={styles.paidChip}>
                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                    <Text style={styles.paidText}>Payment Confirmed</Text>
                  </View>
                )}

                {/* Items */}
                <View style={styles.itemsSection}>
                  {(item.items || []).map((it: any, idx: number) => (
                    <View key={idx} style={styles.orderItem}>
                      <Text style={styles.orderItemQty}>{it.quantity}×</Text>
                      <Text style={styles.orderItemName}>{it.name}</Text>
                      <Text style={styles.orderItemPrice}>₹{Math.round(it.price * it.quantity)}</Text>
                    </View>
                  ))}
                </View>

                {/* Actions */}
                {nextStatus && (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      testID={`advance-order-${item.order_id}`}
                      style={[styles.advanceBtn, { backgroundColor: config.color }]}
                      onPress={() => updateStatus(item.order_id, nextStatus)}
                    >
                      <Text style={styles.advanceBtnText}>{config.nextLabel}</Text>
                    </TouchableOpacity>
                    {item.status === "pending" && (
                      <TouchableOpacity
                        testID={`cancel-order-${item.order_id}`}
                        style={styles.cancelBtn}
                        onPress={() => cancelOrder(item.order_id)}
                      >
                        <Text style={styles.cancelBtnText}>Decline</Text>
                      </TouchableOpacity>
                    )}
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
  safe: { flex: 1, backgroundColor: "#0F172A" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#334155",
  },
  title: { fontSize: 22, fontWeight: "800", color: "#F8FAFC", marginBottom: 10 },
  filterRow: { flexDirection: "row", backgroundColor: "#1E293B", borderRadius: 10, padding: 4, gap: 4 },
  filterTab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
  filterTabActive: { backgroundColor: "#3B82F6" },
  filterText: { fontSize: 12, fontWeight: "700", color: "#64748B" },
  filterTextActive: { color: "#FFF" },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#F8FAFC", marginBottom: 8 },
  emptyText: { fontSize: 14, color: "#94A3B8", textAlign: "center" },
  list: { padding: 16, paddingBottom: 32 },
  orderCard: {
    backgroundColor: "#1E293B", borderRadius: 14, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: "#334155",
  },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  orderId: { fontSize: 13, fontWeight: "700", color: "#F8FAFC" },
  orderTime: { fontSize: 11, color: "#64748B", marginTop: 2 },
  orderTotal: { fontSize: 20, fontWeight: "900", color: "#F8FAFC", textAlign: "right" },
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, marginTop: 4 },
  statusChipText: { fontSize: 10, fontWeight: "700" },
  customerSection: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  customerName: { fontSize: 14, fontWeight: "700", color: "#F8FAFC" },
  customerPhone: { fontSize: 12, color: "#94A3B8" },
  paidChip: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 10 },
  paidText: { fontSize: 12, color: "#10B981", fontWeight: "600" },
  itemsSection: { backgroundColor: "#0F172A", borderRadius: 10, padding: 10, marginBottom: 12, gap: 6 },
  orderItem: { flexDirection: "row", alignItems: "center" },
  orderItemQty: { fontSize: 13, fontWeight: "800", color: "#3B82F6", width: 24 },
  orderItemName: { flex: 1, fontSize: 13, color: "#F8FAFC" },
  orderItemPrice: { fontSize: 13, fontWeight: "600", color: "#94A3B8" },
  actions: { flexDirection: "row", gap: 8 },
  advanceBtn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  advanceBtnText: { fontSize: 13, fontWeight: "700", color: "#FFF" },
  cancelBtn: { backgroundColor: "rgba(239,68,68,0.1)", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: "#EF4444" },
  cancelBtnText: { fontSize: 13, fontWeight: "700", color: "#EF4444" },
});
