import { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Platform
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../utils/api";

// Default location: Mumbai (Bandra) for demo
const DEFAULT_LAT = 19.0560;
const DEFAULT_LNG = 72.8310;

interface Deal {
  deal_id: string;
  vendor_id: string;
  vendor_name: string;
  title: string;
  description: string;
  type: "slow_hour" | "clearance";
  discount_percentage: number;
  current_discount: number;
  distance_km: number;
  closing_time?: string;
  start_time?: string;
  end_time?: string;
}

export default function CustomerHome() {
  const { user } = useAuth();
  const router = useRouter();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [filter, setFilter] = useState<"all" | "slow_hour" | "clearance">("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [location, setLocation] = useState({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
  const [locationGranted, setLocationGranted] = useState(false);

  useEffect(() => {
    requestLocation();
  }, []);

  const requestLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        setLocationGranted(true);
      }
    } catch {}
    await fetchDeals(location.lat, location.lng);
  };

  const fetchDeals = useCallback(async (lat = location.lat, lng = location.lng) => {
    try {
      const data = await api.get(`/api/customer/deals/nearby?lat=${lat}&lng=${lng}`);
      setDeals(Array.isArray(data) ? data : []);
    } catch {
      setDeals([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDeals();
  };

  const filtered = filter === "all" ? deals : deals.filter((d) => d.type === filter);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting}, {user?.name?.split(" ")[0]} 👋</Text>
          <Text style={styles.subheading}>
            {locationGranted ? "Deals near your location" : "Deals in Mumbai"}
          </Text>
        </View>
        <View style={styles.logoBadge}>
          <Text style={styles.logoChar}>Z</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(["all", "slow_hour", "clearance"] as const).map((f) => (
          <TouchableOpacity
            testID={`filter-${f}`}
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
              {f === "all" ? "All Deals" : f === "slow_hour" ? "⏰ Slow Hour" : "🔥 Clearance"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF5722" />
          <Text style={styles.loadingText}>Finding deals near you...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF5722" />}
          showsVerticalScrollIndicator={false}
        >
          {!locationGranted && (
            <View style={styles.locationBanner}>
              <Ionicons name="location-outline" size={18} color="#F59E0B" />
              <Text style={styles.locationBannerText}>
                Enable location for accurate nearby deals
              </Text>
            </View>
          )}

          {filtered.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyTitle}>No deals found</Text>
              <Text style={styles.emptyText}>
                {filter === "all" ? "No active deals near you right now." : "No " + filter.replace("_", " ") + " deals nearby."}
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>{filtered.length} deal{filtered.length !== 1 ? "s" : ""} near you</Text>
              {filtered.map((deal) => (
                <DealCard key={deal.deal_id} deal={deal} onPress={() => router.push(`/(customer)/vendor/${deal.vendor_id}`)} />
              ))}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function DealCard({ deal, onPress }: { deal: Deal; onPress: () => void }) {
  const isSlowHour = deal.type === "slow_hour";
  const discount = deal.current_discount || deal.discount_percentage;

  return (
    <TouchableOpacity testID={`deal-card-${deal.deal_id}`} style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* Top section */}
      <View style={styles.cardTop}>
        <View style={[styles.typeBadge, { backgroundColor: isSlowHour ? "#DCFCE7" : "#FFF3E0" }]}>
          <Text style={[styles.typeBadgeText, { color: isSlowHour ? "#10B981" : "#FF5722" }]}>
            {isSlowHour ? "⏰ Slow Hour" : "🔥 Clearance"}
          </Text>
        </View>
        <View style={styles.distanceBadge}>
          <Ionicons name="location" size={10} color="#94A3B8" />
          <Text style={styles.distanceText}>{deal.distance_km} km</Text>
        </View>
      </View>

      {/* Vendor */}
      <Text style={styles.vendorName}>{deal.vendor_name}</Text>
      <Text style={styles.dealTitle}>{deal.title}</Text>
      <Text style={styles.dealDesc} numberOfLines={2}>{deal.description}</Text>

      {/* Bottom */}
      <View style={styles.cardBottom}>
        <View style={[styles.discountBadge, { backgroundColor: isSlowHour ? "#10B981" : "#FF5722" }]}>
          <Text style={styles.discountText}>{Math.round(discount)}% OFF</Text>
          {!isSlowHour && <Text style={styles.discountSubtext}> (↑ auto)</Text>}
        </View>
        <TouchableOpacity style={styles.viewBtn} onPress={onPress}>
          <Text style={styles.viewBtnText}>View Menu →</Text>
        </TouchableOpacity>
      </View>

      {/* Time info */}
      {deal.start_time && deal.end_time && (
        <View style={styles.timeRow}>
          <Ionicons name="time-outline" size={12} color="#94A3B8" />
          <Text style={styles.timeText}>{deal.start_time} – {deal.end_time}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8F9FA" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16,
    backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E2E8F0",
  },
  greeting: { fontSize: 18, fontWeight: "800", color: "#121212", letterSpacing: -0.3 },
  subheading: { fontSize: 13, color: "#64748B", marginTop: 2 },
  logoBadge: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: "#FF5722",
    alignItems: "center", justifyContent: "center",
  },
  logoChar: { fontSize: 20, fontWeight: "900", color: "#FFF" },
  filterRow: {
    flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: "#FFFFFF", gap: 8, borderBottomWidth: 1, borderBottomColor: "#E2E8F0",
  },
  filterTab: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 99,
    backgroundColor: "#F1F5F9",
  },
  filterTabActive: { backgroundColor: "#FF5722" },
  filterTabText: { fontSize: 12, fontWeight: "600", color: "#64748B" },
  filterTabTextActive: { color: "#FFF" },
  scroll: { padding: 16, paddingBottom: 32 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  loadingText: { color: "#64748B", fontSize: 15 },
  locationBanner: {
    flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFF8E7",
    borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: "#FEE08B",
  },
  locationBannerText: { fontSize: 13, color: "#92400E", flex: 1 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#64748B", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  emptyContainer: { alignItems: "center", paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#121212", marginBottom: 8 },
  emptyText: { fontSize: 14, color: "#64748B", textAlign: "center" },
  card: {
    backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: "#E2E8F0",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  typeBadgeText: { fontSize: 11, fontWeight: "700" },
  distanceBadge: { flexDirection: "row", alignItems: "center", gap: 3 },
  distanceText: { fontSize: 12, color: "#94A3B8", fontWeight: "600" },
  vendorName: { fontSize: 13, fontWeight: "700", color: "#64748B", marginBottom: 2 },
  dealTitle: { fontSize: 18, fontWeight: "800", color: "#121212", marginBottom: 4, letterSpacing: -0.3 },
  dealDesc: { fontSize: 13, color: "#64748B", marginBottom: 12, lineHeight: 18 },
  cardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  discountBadge: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99,
  },
  discountText: { fontSize: 14, fontWeight: "800", color: "#FFF" },
  discountSubtext: { fontSize: 11, color: "rgba(255,255,255,0.8)" },
  viewBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 99,
    backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#E2E8F0",
  },
  viewBtnText: { fontSize: 13, fontWeight: "700", color: "#121212" },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  timeText: { fontSize: 11, color: "#94A3B8" },
});
