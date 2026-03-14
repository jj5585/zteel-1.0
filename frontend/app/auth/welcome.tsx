import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Image } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

export default function Welcome() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#0F172A", "#1E293B", "#0F172A"]} style={StyleSheet.absoluteFill} />

      {/* Hero Visual */}
      <View style={styles.heroContainer}>
        <View style={styles.floatingCard}>
          <Text style={styles.dealEmoji}>🍔</Text>
          <View>
            <Text style={styles.cardTitle}>Maharaja Kitchen</Text>
            <Text style={styles.cardDiscount}>20% OFF Now</Text>
          </View>
          <View style={styles.distanceBadge}>
            <Text style={styles.distanceText}>0.4 km</Text>
          </View>
        </View>

        <View style={[styles.floatingCard, styles.cardOffset]}>
          <Text style={styles.dealEmoji}>🥤</Text>
          <View>
            <Text style={styles.cardTitle}>Fresh Sip Juicery</Text>
            <Text style={[styles.cardDiscount, { color: "#10B981" }]}>Closing Deal 25% ↑</Text>
          </View>
          <View style={[styles.distanceBadge, { backgroundColor: "#10B981" }]}>
            <Text style={styles.distanceText}>1.2 km</Text>
          </View>
        </View>

        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>Z</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.tagline}>HYPER-LOCAL{"\n"}DEALS, NOW.</Text>
        <Text style={styles.subtitle}>
          Discover time-based discounts from restaurants and stores near you. The clock is ticking.
        </Text>

        <TouchableOpacity
          testID="get-started-btn"
          style={styles.primaryButton}
          onPress={() => router.push("/auth/register")}
        >
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="sign-in-btn"
          style={styles.secondaryButton}
          onPress={() => router.push("/auth/login")}
        >
          <Text style={styles.secondaryButtonText}>I already have an account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },
  heroContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FF5722",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    shadowColor: "#FF5722",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  logoText: { fontSize: 40, fontWeight: "900", color: "#FFFFFF" },
  floatingCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(30, 41, 59, 0.95)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    width: width - 60,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  cardOffset: { transform: [{ translateX: 20 }] },
  dealEmoji: { fontSize: 28 },
  cardTitle: { fontSize: 14, fontWeight: "700", color: "#F8FAFC" },
  cardDiscount: { fontSize: 12, color: "#FF5722", fontWeight: "600", marginTop: 2 },
  distanceBadge: {
    backgroundColor: "#FF5722",
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: "auto",
  },
  distanceText: { fontSize: 11, fontWeight: "700", color: "#FFF" },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  tagline: {
    fontSize: 40,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -1.5,
    lineHeight: 46,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#94A3B8",
    lineHeight: 24,
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: "#FF5722",
    borderRadius: 99,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  primaryButtonText: { fontSize: 16, fontWeight: "700", color: "#FFF" },
  secondaryButton: {
    backgroundColor: "transparent",
    borderRadius: 99,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  secondaryButtonText: { fontSize: 16, fontWeight: "600", color: "#94A3B8" },
});
