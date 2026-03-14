import { useEffect, useRef } from "react";
import { View, Text, ActivityIndicator, StyleSheet, Platform, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Linking from "expo-linking";
import { useAuth } from "../../contexts/AuthContext";

export default function AuthCallback() {
  const router = useRouter();
  const { googleAuth } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      let sessionId: string | null = null;

      if (Platform.OS === "web" && typeof window !== "undefined") {
        const hash = window.location.hash;
        const search = window.location.search;
        const combined = hash + "&" + search;
        const match = combined.match(/session_id=([^&]+)/);
        if (match) sessionId = decodeURIComponent(match[1]);
      } else {
        const url = await Linking.getInitialURL();
        if (url) {
          const match = url.match(/session_id=([^&]+)/);
          if (match) sessionId = decodeURIComponent(match[1]);
        }
      }

      if (!sessionId) {
        Alert.alert("Error", "Authentication failed. Please try again.");
        router.replace("/auth/login");
        return;
      }

      await googleAuth(sessionId);
      // Redirect handled by index.tsx
      router.replace("/");
    } catch (e: any) {
      Alert.alert("Auth Failed", e.message || "Google sign-in failed");
      router.replace("/auth/login");
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#FF5722" />
      <Text style={styles.text}>Signing you in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A", alignItems: "center", justifyContent: "center" },
  text: { marginTop: 16, fontSize: 16, color: "#94A3B8" },
});
