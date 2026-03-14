import { useState, useEffect } from "react";
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl, Dimensions
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import api from "../../utils/api";

const { width } = Dimensions.get("window");

export default function VendorAnalytics() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchAnalytics(); }, []);

  const fetchAnalytics = async () => {
    try {
      const data = await api.get("/api/vendor/analytics");
      setAnalytics(data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  if (loading) {
    return <SafeAreaView style={styles.safe}><View style={styles.center}><ActivityIndicator color="#3B82F6" /></View></SafeAreaView>;
  }

  const peakHours = analytics?.peak_hours || {};
  const hours = Object.keys(peakHours).sort((a, b) => parseInt(a) - parseInt(b));
  const maxCount = Math.max(...(Object.values(peakHours) as number[]), 1);

  const metrics = [
    { label: "Today's Revenue", value: `₹${Math.round(analytics?.daily_revenue || 0)}`, icon: "cash", color: "#10B981" },
    { label: "Orders Today", value: String(analytics?.total_orders || 0), icon: "receipt", color: "#3B82F6" },
    { label: "Items Sold", value: String(analytics?.items_sold || 0), icon: "cube", color: "#8B5CF6" },
    { label: "Avg. Order Value", value: `₹${Math.round(analytics?.average_order_value || 0)}`, icon: "trending-up", color: "#F59E0B" },
    { label: "Deal Redemption", value: `${(analytics?.deal_redemption_rate || 0).toFixed(0)}%`, icon: "flash", color: "#FF5722" },
    { label: "Total Orders (All)", value: String(analytics?.total_orders_all || 0), icon: "layers", color: "#EC4899" },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAnalytics(); }} tintColor="#3B82F6" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Analytics</Text>
          <Text style={styles.subtitle}>Today's performance</Text>
        </View>

        {/* Metrics Grid */}
        <View style={styles.metricsGrid}>
          {metrics.map((m) => (
            <View key={m.label} style={[styles.metricCard, { borderLeftColor: m.color }]}>
              <Ionicons name={m.icon as any} size={20} color={m.color} />
              <Text style={styles.metricValue}>{m.value}</Text>
              <Text style={styles.metricLabel}>{m.label}</Text>
            </View>
          ))}
        </View>

        {/* Peak Hours Chart */}
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>📊 Order Activity by Hour</Text>
          {hours.length === 0 ? (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyChartText}>No order data yet</Text>
            </View>
          ) : (
            <View style={styles.barChart}>
              {hours.map((hour) => {
                const count = (peakHours[hour] as number) || 0;
                const heightPct = (count / maxCount) * 100;
                const isHour = parseInt(hour);
                const label = isHour < 12 ? `${isHour}am` : isHour === 12 ? "12pm" : `${isHour - 12}pm`;
                const isPeak = count === maxCount && count > 0;
                return (
                  <View key={hour} style={styles.barCol}>
                    <Text style={styles.barCount}>{count}</Text>
                    <View style={styles.barWrapper}>
                      <View
                        style={[
                          styles.bar,
                          { height: `${Math.max(heightPct, 5)}%`, backgroundColor: isPeak ? "#FF5722" : "#3B82F6" }
                        ]}
                      />
                    </View>
                    <Text style={[styles.barLabel, isPeak && { color: "#FF5722", fontWeight: "800" }]}>{label}</Text>
                  </View>
                );
              })}
            </View>
          )}
          {hours.length > 0 && (
            <View style={styles.peakNote}>
              <View style={[styles.peakDot, { backgroundColor: "#FF5722" }]} />
              <Text style={styles.peakNoteText}>Peak hours highlighted in orange</Text>
            </View>
          )}
        </View>

        {/* Tips */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>💡 Growth Tips</Text>
          {[
            { icon: "flash", tip: "Post Slow Hour deals during quiet times to fill seats" },
            { icon: "time", tip: "Enable Clearance deals 1 hour before closing to reduce waste" },
            { icon: "gift", tip: "Set reward tiers to encourage higher order values" },
            { icon: "location", tip: "Keep your location accurate for maximum deal visibility" },
          ].map((t, i) => (
            <View key={i} style={styles.tipRow}>
              <Ionicons name={t.icon as any} size={16} color="#3B82F6" />
              <Text style={styles.tipText}>{t.tip}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0F172A" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: 16, paddingBottom: 32 },
  header: { marginBottom: 20 },
  title: { fontSize: 26, fontWeight: "900", color: "#F8FAFC", letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: "#94A3B8", marginTop: 2 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  metricCard: {
    flex: 1, minWidth: "45%", backgroundColor: "#1E293B", borderRadius: 12, padding: 14,
    borderLeftWidth: 3, gap: 4,
  },
  metricValue: { fontSize: 22, fontWeight: "900", color: "#F8FAFC", marginTop: 4 },
  metricLabel: { fontSize: 11, color: "#94A3B8", fontWeight: "600" },
  chartSection: {
    backgroundColor: "#1E293B", borderRadius: 14, padding: 16, marginBottom: 24,
    borderWidth: 1, borderColor: "#334155",
  },
  chartTitle: { fontSize: 15, fontWeight: "700", color: "#F8FAFC", marginBottom: 16 },
  emptyChart: { height: 100, alignItems: "center", justifyContent: "center" },
  emptyChartText: { color: "#64748B", fontSize: 14 },
  barChart: { flexDirection: "row", alignItems: "flex-end", height: 120, gap: 4 },
  barCol: { flex: 1, alignItems: "center", height: "100%", justifyContent: "flex-end" },
  barCount: { fontSize: 9, color: "#94A3B8", marginBottom: 2 },
  barWrapper: { flex: 1, width: "100%", justifyContent: "flex-end" },
  bar: { width: "100%", borderRadius: 4, minHeight: 4 },
  barLabel: { fontSize: 9, color: "#64748B", marginTop: 4 },
  peakNote: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 },
  peakDot: { width: 8, height: 8, borderRadius: 4 },
  peakNoteText: { fontSize: 11, color: "#94A3B8" },
  tipsSection: {
    backgroundColor: "#1E293B", borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: "#334155",
  },
  tipsTitle: { fontSize: 15, fontWeight: "700", color: "#F8FAFC", marginBottom: 12 },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  tipText: { flex: 1, fontSize: 13, color: "#94A3B8", lineHeight: 18 },
});
