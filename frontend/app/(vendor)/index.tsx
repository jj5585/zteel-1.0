import { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../utils/api";

const STATUS_COLORS: Record<string, string> = {
  pending: "#F59E0B", confirmed: "#3B82F6", preparing: "#8B5CF6",
  ready: "#10B981", delivered: "#10B981", cancelled: "#EF4444",
};

export default function VendorDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [vendor, setVendor] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => { init(); }, []);

  const init = async () => {
    try {
      const profileData = await api.get("/api/vendor/profile");
      if (!profileData || !profileData.vendor_id) {
        setVendor(null);
        setLoading(false);
        return;
      }
      setVendor(profileData);
      const [orderData, analyticsData] = await Promise.all([
        api.get("/api/vendor/orders"),
        api.get("/api/vendor/analytics"),
      ]);
      setOrders(Array.isArray(orderData) ? orderData.slice(0, 5) : []);
      setAnalytics(analyticsData);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = () => { setRefreshing(true); init(); };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      await api.put(`/api/vendor/orders/${orderId}`, { status });
      init();
    } catch {
      Alert.alert("Error", "Could not update order status");
    }
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: async () => { await logout(); router.replace("/auth/welcome"); } }
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#3B82F6" /></View>
      </SafeAreaView>
    );
  }

  // No profile setup
  if (!vendor) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.setupContainer}>
          <Text style={styles.setupEmoji}>🏪</Text>
          <Text style={styles.setupTitle}>Set Up Your Store</Text>
          <Text style={styles.setupText}>Complete your vendor profile to start posting deals and receiving orders.</Text>
          <TouchableOpacity testID="setup-store-btn" style={styles.setupBtn} onPress={() => router.push("/(vendor)/setup")}>
            <Text style={styles.setupBtnText}>Set Up Store →</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutLink}>
            <Text style={styles.logoutLinkText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const pendingOrders = orders.filter((o) => o.status === "pending").length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.storeName}>{vendor.store_name}</Text>
            <Text style={styles.ownerName}>Hi, {user?.name?.split(" ")[0]} 👋</Text>
          </View>
          <TouchableOpacity testID="logout-vendor-btn" onPress={handleLogout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        {analytics && (
          <View style={styles.statsGrid}>
            <StatCard label="Today's Revenue" value={`₹${Math.round(analytics.daily_revenue)}`} icon="cash" color="#10B981" />
            <StatCard label="Orders Today" value={String(analytics.total_orders)} icon="receipt" color="#3B82F6" />
            <StatCard label="Items Sold" value={String(analytics.items_sold)} icon="cube" color="#8B5CF6" />
            <StatCard label="Avg. Order" value={`₹${Math.round(analytics.average_order_value)}`} icon="trending-up" color="#F59E0B" />
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity testID="create-deal-quick-btn" style={styles.actionBtn} onPress={() => router.push("/(vendor)/create-deal")}>
              <Ionicons name="add-circle" size={24} color="#3B82F6" />
              <Text style={styles.actionBtnText}>New Deal</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="view-orders-btn" style={styles.actionBtn} onPress={() => router.push("/(vendor)/orders")}>
              <Ionicons name="list" size={24} color="#10B981" />
              <Text style={styles.actionBtnText}>Orders</Text>
              {pendingOrders > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{pendingOrders}</Text></View>}
            </TouchableOpacity>
            <TouchableOpacity testID="manage-menu-btn" style={styles.actionBtn} onPress={() => router.push("/(vendor)/menu")}>
              <Ionicons name="restaurant" size={24} color="#F59E0B" />
              <Text style={styles.actionBtnText}>Menu</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="view-analytics-btn" style={styles.actionBtn} onPress={() => router.push("/(vendor)/analytics")}>
              <Ionicons name="analytics" size={24} color="#8B5CF6" />
              <Text style={styles.actionBtnText}>Analytics</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Orders */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            {pendingOrders > 0 && (
              <View style={[styles.badge, { position: "relative", backgroundColor: "#FF5722" }]}>
                <Text style={styles.badgeText}>{pendingOrders} new</Text>
              </View>
            )}
          </View>
          {orders.length === 0 ? (
            <Text style={styles.emptyText}>No orders yet. Create a deal to get started!</Text>
          ) : (
            orders.map((order) => (
              <View key={order.order_id} testID={`vendor-order-${order.order_id}`} style={styles.orderCard}>
                <View style={styles.orderTop}>
                  <View>
                    <Text style={styles.orderId}>#{order.order_id}</Text>
                    <Text style={styles.customerName}>{order.customer_name}</Text>
                    {order.customer_phone && <Text style={styles.customerPhone}>{order.customer_phone}</Text>}
                  </View>
                  <View>
                    <Text style={styles.orderTotal}>₹{Math.round(order.total)}</Text>
                    <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[order.status] || "#64748B" }]}>
                      <Text style={styles.statusText}>{order.status}</Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.orderItemsList} numberOfLines={1}>
                  {(order.items || []).map((i: any) => `${i.quantity}× ${i.name}`).join(", ")}
                </Text>
                {order.status === "pending" && (
                  <View style={styles.orderActions}>
                    <TouchableOpacity
                      testID={`confirm-order-${order.order_id}`}
                      style={[styles.orderActionBtn, { backgroundColor: "#10B981" }]}
                      onPress={() => updateOrderStatus(order.order_id, "confirmed")}
                    >
                      <Text style={styles.orderActionText}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      testID={`reject-order-${order.order_id}`}
                      style={[styles.orderActionBtn, { backgroundColor: "#EF4444" }]}
                      onPress={() => updateOrderStatus(order.order_id, "cancelled")}
                    >
                      <Text style={styles.orderActionText}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {order.status === "confirmed" && (
                  <TouchableOpacity
                    style={[styles.orderActionBtn, { backgroundColor: "#8B5CF6", alignSelf: "flex-start" }]}
                    onPress={() => updateOrderStatus(order.order_id, "preparing")}
                  >
                    <Text style={styles.orderActionText}>Mark Preparing</Text>
                  </TouchableOpacity>
                )}
                {order.status === "preparing" && (
                  <TouchableOpacity
                    style={[styles.orderActionBtn, { backgroundColor: "#3B82F6", alignSelf: "flex-start" }]}
                    onPress={() => updateOrderStatus(order.order_id, "ready")}
                  >
                    <Text style={styles.orderActionText}>Mark Ready</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Ionicons name={icon as any} size={20} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0F172A" },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  setupContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 },
  setupEmoji: { fontSize: 64, marginBottom: 16 },
  setupTitle: { fontSize: 24, fontWeight: "800", color: "#F8FAFC", marginBottom: 8, textAlign: "center" },
  setupText: { fontSize: 15, color: "#94A3B8", textAlign: "center", lineHeight: 22, marginBottom: 28 },
  setupBtn: { backgroundColor: "#3B82F6", borderRadius: 99, paddingHorizontal: 32, paddingVertical: 14 },
  setupBtnText: { fontSize: 16, fontWeight: "700", color: "#FFF" },
  logoutLink: { marginTop: 16 },
  logoutLinkText: { color: "#64748B", fontSize: 14 },
  scroll: { padding: 16, paddingBottom: 32 },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: 20,
  },
  storeName: { fontSize: 22, fontWeight: "900", color: "#F8FAFC", letterSpacing: -0.5 },
  ownerName: { fontSize: 14, color: "#94A3B8", marginTop: 2 },
  logoutBtn: { padding: 8 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, minWidth: "45%", backgroundColor: "#1E293B", borderRadius: 12, padding: 14,
    borderLeftWidth: 3, gap: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3,
  },
  statValue: { fontSize: 22, fontWeight: "900", color: "#F8FAFC", marginTop: 4 },
  statLabel: { fontSize: 11, color: "#94A3B8", fontWeight: "600" },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 },
  actionsRow: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flex: 1, backgroundColor: "#1E293B", borderRadius: 12, padding: 14,
    alignItems: "center", gap: 6, borderWidth: 1, borderColor: "#334155",
  },
  actionBtnText: { fontSize: 11, fontWeight: "600", color: "#F8FAFC", textAlign: "center" },
  badge: {
    position: "absolute", top: -4, right: -4, backgroundColor: "#EF4444",
    borderRadius: 99, paddingHorizontal: 6, paddingVertical: 2, minWidth: 20, alignItems: "center",
  },
  badgeText: { fontSize: 10, fontWeight: "900", color: "#FFF" },
  emptyText: { fontSize: 14, color: "#64748B", fontStyle: "italic", textAlign: "center", paddingVertical: 20 },
  orderCard: {
    backgroundColor: "#1E293B", borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: "#334155",
  },
  orderTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  orderId: { fontSize: 11, color: "#64748B", fontWeight: "600" },
  customerName: { fontSize: 15, fontWeight: "700", color: "#F8FAFC" },
  customerPhone: { fontSize: 12, color: "#94A3B8", marginTop: 2 },
  orderTotal: { fontSize: 18, fontWeight: "800", color: "#F8FAFC", textAlign: "right" },
  statusDot: { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-end", marginTop: 4 },
  statusText: { fontSize: 10, fontWeight: "700", color: "#FFF", textTransform: "capitalize" },
  orderItemsList: { fontSize: 12, color: "#94A3B8", marginBottom: 10 },
  orderActions: { flexDirection: "row", gap: 8 },
  orderActionBtn: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  orderActionText: { fontSize: 13, fontWeight: "700", color: "#FFF" },
});
