import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Switch
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import api from "../../utils/api";

export default function CreateDeal() {
  const router = useRouter();
  const [dealType, setDealType] = useState<"slow_hour" | "clearance">("slow_hour");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [discount, setDiscount] = useState("20");
  const [startTime, setStartTime] = useState("14:00");
  const [endTime, setEndTime] = useState("17:00");
  const [closingTime, setClosingTime] = useState("22:00");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title || !discount) {
      Alert.alert("Error", "Title and discount are required");
      return;
    }
    const discountNum = parseFloat(discount);
    if (isNaN(discountNum) || discountNum <= 0 || discountNum > 100) {
      Alert.alert("Error", "Discount must be between 1-100%");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/vendor/deals", {
        title: title.trim(),
        description: description.trim(),
        type: dealType,
        discount_percentage: discountNum,
        start_time: startTime,
        end_time: endTime,
        closing_time: dealType === "clearance" ? closingTime : null,
      });
      Alert.alert("✅ Deal Created!", "Your deal is now live for nearby customers.", [
        { text: "View Deals", onPress: () => router.push("/(vendor)/deals") },
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not create deal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity testID="back-btn" onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#F8FAFC" />
            </TouchableOpacity>
            <Text style={styles.title}>Create Deal</Text>
          </View>

          {/* Deal Type */}
          <Text style={styles.label}>Deal Type</Text>
          <View style={styles.typeRow}>
            <TouchableOpacity
              testID="deal-type-slow-hour"
              style={[styles.typeCard, dealType === "slow_hour" && styles.typeCardActive]}
              onPress={() => setDealType("slow_hour")}
            >
              <Text style={styles.typeEmoji}>⏰</Text>
              <Text style={[styles.typeTitle, dealType === "slow_hour" && styles.typeTitleActive]}>Slow Hour</Text>
              <Text style={styles.typeSub}>Fixed % off during quiet hours. Radius: 1 km</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="deal-type-clearance"
              style={[styles.typeCard, dealType === "clearance" && styles.typeCardActive, dealType === "clearance" && { borderColor: "#FF5722" }]}
              onPress={() => setDealType("clearance")}
            >
              <Text style={styles.typeEmoji}>🔥</Text>
              <Text style={[styles.typeTitle, dealType === "clearance" && styles.typeTitleActive, dealType === "clearance" && { color: "#FF5722" }]}>Clearance</Text>
              <Text style={styles.typeSub}>Auto-increasing discount toward closing. Radius: 3 km</Text>
            </TouchableOpacity>
          </View>

          {/* Dynamic Discount Info for Clearance */}
          {dealType === "clearance" && (
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>📈 How Dynamic Pricing Works</Text>
              <Text style={styles.infoText}>Starting at your base discount, the deal % increases automatically:</Text>
              <Text style={styles.infoItem}>60+ min before closing → base %</Text>
              <Text style={styles.infoItem}>40 min before → base + 10%</Text>
              <Text style={styles.infoItem}>20 min before → base + 20%</Text>
              <Text style={styles.infoItem}>10 min before → base + 25%</Text>
            </View>
          )}

          {/* Title */}
          <Text style={styles.label}>Deal Title *</Text>
          <TextInput
            testID="deal-title-input"
            style={styles.input}
            placeholder='e.g., "Afternoon Special" or "Closing Time Deals"'
            placeholderTextColor="#64748B"
            value={title}
            onChangeText={setTitle}
          />

          {/* Description */}
          <Text style={styles.label}>Description</Text>
          <TextInput
            testID="deal-description-input"
            style={[styles.input, styles.textArea]}
            placeholder="Describe what's on offer..."
            placeholderTextColor="#64748B"
            multiline
            numberOfLines={3}
            value={description}
            onChangeText={setDescription}
          />

          {/* Discount */}
          <Text style={styles.label}>
            {dealType === "slow_hour" ? "Discount %" : "Base Discount % (will auto-increase)"}
          </Text>
          <View style={styles.discountRow}>
            <TextInput
              testID="discount-input"
              style={[styles.input, { flex: 1 }]}
              placeholder="20"
              placeholderTextColor="#64748B"
              keyboardType="decimal-pad"
              value={discount}
              onChangeText={setDiscount}
            />
            <View style={styles.discountPreview}>
              <Text style={styles.discountPreviewText}>{discount}% OFF</Text>
            </View>
          </View>

          {/* Time */}
          <Text style={styles.label}>Deal Hours</Text>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.timeHint}>Start Time</Text>
              <TextInput
                testID="start-time-input"
                style={styles.input}
                placeholder="14:00"
                placeholderTextColor="#64748B"
                value={startTime}
                onChangeText={setStartTime}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.timeHint}>End Time</Text>
              <TextInput
                testID="end-time-input"
                style={styles.input}
                placeholder="17:00"
                placeholderTextColor="#64748B"
                value={endTime}
                onChangeText={setEndTime}
              />
            </View>
          </View>

          {/* Closing Time for Clearance */}
          {dealType === "clearance" && (
            <>
              <Text style={styles.label}>Store Closing Time *</Text>
              <TextInput
                testID="closing-time-input"
                style={styles.input}
                placeholder="22:00"
                placeholderTextColor="#64748B"
                value={closingTime}
                onChangeText={setClosingTime}
              />
              <Text style={styles.hintText}>
                Discount will increase as closing time approaches
              </Text>
            </>
          )}

          {/* Submit */}
          <TouchableOpacity testID="create-deal-btn" style={styles.createBtn} onPress={handleCreate} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="flash" size={20} color="#FFF" />
                <Text style={styles.createBtnText}>Post Deal Now</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0F172A" },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  backBtn: { padding: 4 },
  title: { fontSize: 22, fontWeight: "800", color: "#F8FAFC", letterSpacing: -0.5 },
  label: { fontSize: 11, fontWeight: "700", color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 },
  typeRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  typeCard: {
    flex: 1, backgroundColor: "#1E293B", borderRadius: 12, padding: 14,
    borderWidth: 2, borderColor: "#334155",
  },
  typeCardActive: { borderColor: "#3B82F6", backgroundColor: "rgba(59,130,246,0.1)" },
  typeEmoji: { fontSize: 24, marginBottom: 6 },
  typeTitle: { fontSize: 15, fontWeight: "700", color: "#94A3B8", marginBottom: 4 },
  typeTitleActive: { color: "#3B82F6" },
  typeSub: { fontSize: 10, color: "#64748B", lineHeight: 14 },
  infoBox: {
    backgroundColor: "rgba(255,87,34,0.1)", borderRadius: 12, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: "rgba(255,87,34,0.3)",
  },
  infoTitle: { fontSize: 13, fontWeight: "700", color: "#FF5722", marginBottom: 8 },
  infoText: { fontSize: 12, color: "#94A3B8", marginBottom: 6 },
  infoItem: { fontSize: 12, color: "#94A3B8", paddingLeft: 8, marginBottom: 2 },
  input: {
    height: 52, backgroundColor: "#1E293B", borderRadius: 10, paddingHorizontal: 14,
    fontSize: 15, color: "#F8FAFC", borderWidth: 1, borderColor: "#334155", marginBottom: 16,
  },
  textArea: { height: 80, paddingTop: 12, textAlignVertical: "top" },
  discountRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  discountPreview: {
    backgroundColor: "#FF5722", borderRadius: 10, height: 52, paddingHorizontal: 14,
    alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  discountPreviewText: { fontSize: 16, fontWeight: "900", color: "#FFF" },
  row: { flexDirection: "row", gap: 10 },
  timeHint: { fontSize: 11, color: "#64748B", marginBottom: 4 },
  hintText: { fontSize: 11, color: "#64748B", marginTop: -10, marginBottom: 16 },
  createBtn: {
    backgroundColor: "#3B82F6", borderRadius: 14, height: 56, flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 10, marginTop: 8,
  },
  createBtnText: { fontSize: 16, fontWeight: "700", color: "#FFF" },
});
