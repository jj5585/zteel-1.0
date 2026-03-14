import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import api from "../../utils/api";

const CATEGORIES = ["restaurant", "juice_bar", "grocery", "cafe", "bakery", "pharmacy", "other"];

export default function VendorSetup() {
  const router = useRouter();
  const [storeName, setStoreName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("19.0560");
  const [longitude, setLongitude] = useState("72.8310");
  const [category, setCategory] = useState("restaurant");
  const [openingTime, setOpeningTime] = useState("10:00");
  const [closingTime, setClosingTime] = useState("22:00");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!storeName || !address) {
      Alert.alert("Error", "Store name and address are required");
      return;
    }
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng)) {
      Alert.alert("Error", "Please enter valid coordinates");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/vendor/setup", {
        store_name: storeName.trim(),
        description: description.trim(),
        address: address.trim(),
        latitude: lat,
        longitude: lng,
        category,
        opening_time: openingTime,
        closing_time: closingTime,
      });
      Alert.alert("🎉 Store Created!", "Your store profile is ready. Start posting deals!", [
        { text: "Go to Dashboard", onPress: () => router.replace("/(vendor)") }
      ]);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not save profile");
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
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#F8FAFC" />
            </TouchableOpacity>
            <Text style={styles.title}>Set Up Your Store</Text>
          </View>

          <Text style={styles.subtitle}>Tell customers about your store</Text>

          {/* Store Name */}
          <Label text="Store Name *" />
          <TextInput
            testID="store-name-input"
            style={styles.input}
            placeholder="e.g., Maharaja Kitchen"
            placeholderTextColor="#64748B"
            value={storeName}
            onChangeText={setStoreName}
          />

          {/* Description */}
          <Label text="Description" />
          <TextInput
            testID="description-input"
            style={[styles.input, styles.textArea]}
            placeholder="What do you serve? What's special about your store?"
            placeholderTextColor="#64748B"
            multiline
            numberOfLines={3}
            value={description}
            onChangeText={setDescription}
          />

          {/* Address */}
          <Label text="Address *" />
          <TextInput
            testID="address-input"
            style={styles.input}
            placeholder="Full store address"
            placeholderTextColor="#64748B"
            value={address}
            onChangeText={setAddress}
          />

          {/* Coordinates */}
          <Label text="Location Coordinates" />
          <View style={styles.row}>
            <TextInput
              testID="latitude-input"
              style={[styles.input, { flex: 1 }]}
              placeholder="Latitude"
              placeholderTextColor="#64748B"
              keyboardType="decimal-pad"
              value={latitude}
              onChangeText={setLatitude}
            />
            <TextInput
              testID="longitude-input"
              style={[styles.input, { flex: 1 }]}
              placeholder="Longitude"
              placeholderTextColor="#64748B"
              keyboardType="decimal-pad"
              value={longitude}
              onChangeText={setLongitude}
            />
          </View>
          <Text style={styles.coordsHint}>💡 Find your coordinates at maps.google.com → right-click on your location</Text>

          {/* Category */}
          <Label text="Category" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                testID={`category-${cat}`}
                key={cat}
                style={[styles.catChip, category === cat && styles.catChipActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.catChipText, category === cat && styles.catChipTextActive]}>
                  {cat.replace("_", " ")}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Hours */}
          <Label text="Operating Hours" />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.hintText}>Opens at</Text>
              <TextInput
                testID="opening-time-input"
                style={styles.input}
                placeholder="10:00"
                placeholderTextColor="#64748B"
                value={openingTime}
                onChangeText={setOpeningTime}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.hintText}>Closes at</Text>
              <TextInput
                testID="closing-time-input"
                style={styles.input}
                placeholder="22:00"
                placeholderTextColor="#64748B"
                value={closingTime}
                onChangeText={setClosingTime}
              />
            </View>
          </View>
          <Text style={styles.coordsHint}>Use 24-hour format (e.g., 22:00 for 10 PM)</Text>

          {/* Save */}
          <TouchableOpacity testID="save-profile-btn" style={styles.saveBtn} onPress={handleSave} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                <Text style={styles.saveBtnText}>Save & Continue</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={{ color: "#94A3B8", fontSize: 12, fontWeight: "700", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>{text}</Text>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0F172A" },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  backBtn: { padding: 4 },
  title: { fontSize: 22, fontWeight: "800", color: "#F8FAFC", letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: "#94A3B8", marginBottom: 24 },
  input: {
    height: 52, backgroundColor: "#1E293B", borderRadius: 10, paddingHorizontal: 14,
    fontSize: 15, color: "#F8FAFC", borderWidth: 1, borderColor: "#334155", marginBottom: 16,
  },
  textArea: { height: 80, paddingTop: 12, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: 10 },
  coordsHint: { fontSize: 11, color: "#64748B", marginTop: -10, marginBottom: 16 },
  hintText: { fontSize: 11, color: "#64748B", marginBottom: 4 },
  categoryRow: { paddingBottom: 4, gap: 8, marginBottom: 16 },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, backgroundColor: "#1E293B", borderWidth: 1, borderColor: "#334155" },
  catChipActive: { backgroundColor: "#3B82F6", borderColor: "#3B82F6" },
  catChipText: { fontSize: 13, fontWeight: "600", color: "#94A3B8", textTransform: "capitalize" },
  catChipTextActive: { color: "#FFF" },
  saveBtn: {
    backgroundColor: "#3B82F6", borderRadius: 14, height: 56, flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 10, marginTop: 8,
  },
  saveBtnText: { fontSize: 16, fontWeight: "700", color: "#FFF" },
});
