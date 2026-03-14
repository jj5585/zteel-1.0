import { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Platform, Dimensions, ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import api from "../../utils/api";

const { width, height } = Dimensions.get("window");
const DEFAULT_LAT = 19.0560;
const DEFAULT_LNG = 72.8310;

export default function MapScreen() {
  const router = useRouter();
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [region, setRegion] = useState({
    latitude: DEFAULT_LAT,
    longitude: DEFAULT_LNG,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setRegion({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        });
        await fetchVendors(loc.coords.latitude, loc.coords.longitude);
      } else {
        await fetchVendors(DEFAULT_LAT, DEFAULT_LNG);
      }
    } catch {
      await fetchVendors(DEFAULT_LAT, DEFAULT_LNG);
    }
    setLoading(false);
  };

  const fetchVendors = async (lat: number, lng: number) => {
    try {
      const data = await api.get(`/api/customer/vendors/nearby?lat=${lat}&lng=${lng}`);
      setVendors(Array.isArray(data) ? data : []);
    } catch {
      setVendors([]);
    }
  };

  const categoryEmoji: Record<string, string> = {
    restaurant: "🍽️",
    juice_bar: "🥤",
    grocery: "🛒",
    cafe: "☕",
    default: "🏪",
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Explore Nearby</Text>
        <Text style={styles.subtitle}>{vendors.length} stores within 5km</Text>
      </View>

      {/* Map Container */}
      <View style={styles.mapContainer}>
        {Platform.OS !== "web" ? (
          <NativeMap region={region} vendors={vendors} onMarkerPress={(id) => router.push(`/(customer)/vendor/${id}`)} />
        ) : (
          <WebMapFallback vendors={vendors} region={region} />
        )}
      </View>

      {/* Vendor List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#FF5722" />
        </View>
      ) : (
        <ScrollView style={styles.vendorList} showsVerticalScrollIndicator={false}>
          <Text style={styles.listTitle}>Nearby Stores</Text>
          {vendors.map((vendor) => (
            <TouchableOpacity
              testID={`vendor-map-item-${vendor.vendor_id}`}
              key={vendor.vendor_id}
              style={styles.vendorItem}
              onPress={() => router.push(`/(customer)/vendor/${vendor.vendor_id}`)}
            >
              <View style={styles.vendorIcon}>
                <Text style={styles.vendorEmoji}>{categoryEmoji[vendor.category] || categoryEmoji.default}</Text>
              </View>
              <View style={styles.vendorInfo}>
                <Text style={styles.vendorName}>{vendor.store_name}</Text>
                <Text style={styles.vendorAddress} numberOfLines={1}>{vendor.address}</Text>
                {vendor.active_deals > 0 && (
                  <Text style={styles.dealsBadge}>{vendor.active_deals} active deal{vendor.active_deals > 1 ? "s" : ""}</Text>
                )}
              </View>
              <View style={styles.vendorRight}>
                <Text style={styles.distanceText}>{vendor.distance_km} km</Text>
                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// Native map (lazy loaded to avoid web errors)
function NativeMap({ region, vendors, onMarkerPress }: any) {
  const [MapView, setMapView] = useState<any>(null);
  const [Marker, setMarker] = useState<any>(null);

  useEffect(() => {
    import("react-native-maps").then((mod) => {
      setMapView(() => mod.default);
      setMarker(() => mod.Marker);
    }).catch(() => {});
  }, []);

  if (!MapView || !Marker) {
    return <View style={styles.mapPlaceholder}><Text style={styles.mapPlaceholderText}>Loading map...</Text></View>;
  }

  return (
    <MapView style={styles.map} region={region}>
      {vendors.map((v: any) => (
        <Marker
          key={v.vendor_id}
          coordinate={{ latitude: v.latitude, longitude: v.longitude }}
          title={v.store_name}
          description={`${v.active_deals} deals • ${v.distance_km}km`}
          onPress={() => onMarkerPress(v.vendor_id)}
          pinColor={v.active_deals > 0 ? "#FF5722" : "#94A3B8"}
        />
      ))}
    </MapView>
  );
}

function WebMapFallback({ vendors, region }: any) {
  return (
    <View style={styles.webMapFallback}>
      <Text style={styles.webMapEmoji}>🗺️</Text>
      <Text style={styles.webMapTitle}>Map View</Text>
      <Text style={styles.webMapText}>Center: {region.latitude.toFixed(4)}, {region.longitude.toFixed(4)}</Text>
      <Text style={styles.webMapSubtext}>{vendors.length} vendors nearby</Text>
      <Text style={styles.webMapNote}>Open on mobile for interactive map</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8F9FA" },
  header: {
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E2E8F0",
  },
  title: { fontSize: 22, fontWeight: "800", color: "#121212", letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: "#64748B", marginTop: 2 },
  mapContainer: { height: 220, backgroundColor: "#E2E8F0" },
  map: { width: "100%", height: "100%" },
  mapPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#E2E8F0" },
  mapPlaceholderText: { color: "#64748B" },
  webMapFallback: {
    flex: 1, alignItems: "center", justifyContent: "center",
    backgroundColor: "#1E293B", gap: 4,
  },
  webMapEmoji: { fontSize: 40, marginBottom: 8 },
  webMapTitle: { fontSize: 18, fontWeight: "700", color: "#F8FAFC" },
  webMapText: { fontSize: 13, color: "#94A3B8" },
  webMapSubtext: { fontSize: 13, color: "#FF5722", fontWeight: "600" },
  webMapNote: { fontSize: 11, color: "#64748B", marginTop: 4 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  vendorList: { flex: 1, padding: 16 },
  listTitle: { fontSize: 13, fontWeight: "700", color: "#64748B", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  vendorItem: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF",
    borderRadius: 12, padding: 14, marginBottom: 8, gap: 12,
    borderWidth: 1, borderColor: "#E2E8F0",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  vendorIcon: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: "#F1F5F9",
    alignItems: "center", justifyContent: "center",
  },
  vendorEmoji: { fontSize: 22 },
  vendorInfo: { flex: 1 },
  vendorName: { fontSize: 15, fontWeight: "700", color: "#121212" },
  vendorAddress: { fontSize: 12, color: "#94A3B8", marginTop: 2 },
  dealsBadge: { fontSize: 11, color: "#FF5722", fontWeight: "700", marginTop: 3 },
  vendorRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  distanceText: { fontSize: 13, color: "#64748B", fontWeight: "600" },
});
