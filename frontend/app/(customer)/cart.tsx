import { useState, useEffect, useRef } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Modal, Platform
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCart } from "../../contexts/CartContext";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../utils/api";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "";

const REWARD_COLORS: Record<string, string[]> = {
  green: ["#10B981", "#34D399"],
  yellow: ["#F59E0B", "#FCD34D"],
  orange: ["#FF5722", "#FF8A65"],
};

export default function CartScreen() {
  const { items, vendorId, vendorName, removeItem, updateQuantity, clearCart, total, itemCount } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const [rewardTiers, setRewardTiers] = useState<any[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    if (vendorId) fetchRewards(vendorId);
  }, [vendorId]);

  const fetchRewards = async (vid: string) => {
    try {
      const data = await api.get(`/api/customer/vendors/${vid}/rewards`);
      setRewardTiers(Array.isArray(data) ? data : []);
    } catch {}
  };

  // Find next/achieved tiers
  const achievedTiers = rewardTiers.filter((t) => total >= t.threshold);
  const nextTier = rewardTiers.find((t) => total < t.threshold);
  const lastAchieved = achievedTiers.length > 0 ? achievedTiers[achievedTiers.length - 1] : null;
  const progressPercent = nextTier
    ? Math.min(100, ((total - (lastAchieved?.threshold || 0)) / (nextTier.threshold - (lastAchieved?.threshold || 0))) * 100)
    : achievedTiers.length > 0 ? 100 : 0;
  const progressColor = nextTier ? REWARD_COLORS[nextTier.color] || REWARD_COLORS.green : ["#10B981", "#34D399"];

  const handleCheckout = async () => {
    if (items.length === 0) return;
    if (!vendorId) return;
    setCheckingOut(true);
    try {
      // 1. Create order
      const orderResp = await api.post("/api/orders", {
        vendor_id: vendorId,
        items: items.map((i) => ({ item_id: i.item_id, name: i.name, price: i.price, quantity: i.quantity })),
        total: Math.round(total),
        discount: 0,
      });
      const orderId = orderResp.order_id;
      setCurrentOrderId(orderId);

      // 2. Create Razorpay order
      const payResp = await api.post("/api/payments/create-order", { amount: Math.round(total), order_id: orderId });
      setPaymentData(payResp);

      if (Platform.OS === "web" || payResp.is_mock) {
        // Mock/web payment flow
        await handleMockPayment(orderId, payResp);
      } else {
        setShowPayment(true);
      }
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not initiate payment");
    } finally {
      setCheckingOut(false);
    }
  };

  const handleMockPayment = async (orderId: string, payData: any) => {
    Alert.alert(
      "🧪 Test Payment",
      `Amount: ₹${Math.round(total)}\nOrder: #${orderId}\n\nThis is a simulated payment in test mode.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "✅ Simulate Success",
          onPress: async () => {
            try {
              await api.post("/api/payments/verify", {
                razorpay_order_id: payData.razorpay_order_id,
                razorpay_payment_id: `pay_mock_${Date.now()}`,
                razorpay_signature: "mock_signature",
                order_id: orderId,
              });
              clearCart();
              Alert.alert("🎉 Order Placed!", `Your order #${orderId} has been confirmed! The vendor will prepare it shortly.`, [
                { text: "View Orders", onPress: () => router.push("/(customer)/orders") },
                { text: "OK" }
              ]);
            } catch (e: any) {
              Alert.alert("Error", e.message || "Payment failed");
            }
          }
        }
      ]
    );
  };

  const getRazorpayHtml = () => {
    if (!paymentData) return "<html><body><p>Loading...</p></body></html>";
    const { key_id, amount, razorpay_order_id } = paymentData;
    const safeStr = (s: string) => (s || "").replace(/'/g, "\\'");
    return `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>body{margin:0;background:#0F172A;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;color:white;}</style>
</head><body>
<div id="msg"><p>Opening payment...</p></div>
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script>
window.onload=function(){
  var opts={
    key:'${safeStr(key_id)}',
    amount:${amount},
    currency:'INR',
    name:'Zteeel',
    description:'Food Order',
    order_id:'${safeStr(razorpay_order_id)}',
    prefill:{name:'${safeStr(user?.name || "")}',email:'${safeStr(user?.email || "")}',contact:'${safeStr(user?.phone || "9000000000")}'},
    config:{display:{blocks:{utib:{name:'Pay via UPI',instruments:[{method:'upi'}]}},sequence:['block.utib'],preferences:{show_default_blocks:true}}},
    theme:{color:'#FF5722'},
    handler:function(r){window.ReactNativeWebView.postMessage(JSON.stringify({type:'success',razorpay_payment_id:r.razorpay_payment_id,razorpay_order_id:r.razorpay_order_id,razorpay_signature:r.razorpay_signature}));},
    modal:{ondismiss:function(){window.ReactNativeWebView.postMessage(JSON.stringify({type:'dismiss'}));}}
  };
  var rzp=new Razorpay(opts);
  rzp.on('payment.failed',function(r){window.ReactNativeWebView.postMessage(JSON.stringify({type:'failure',error:r.error.description}));});
  rzp.open();
};
</script></body></html>`;
  };

  const handleWebViewMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "success") {
        setShowPayment(false);
        try {
          await api.post("/api/payments/verify", {
            razorpay_order_id: data.razorpay_order_id,
            razorpay_payment_id: data.razorpay_payment_id,
            razorpay_signature: data.razorpay_signature,
            order_id: currentOrderId,
          });
          clearCart();
          Alert.alert("🎉 Order Placed!", `#${currentOrderId} confirmed!`, [
            { text: "View Orders", onPress: () => router.push("/(customer)/orders") },
            { text: "OK" }
          ]);
        } catch (e: any) {
          Alert.alert("Error", "Payment recorded but verification failed");
        }
      } else if (data.type === "dismiss") {
        setShowPayment(false);
      } else if (data.type === "failure") {
        setShowPayment(false);
        Alert.alert("Payment Failed", data.error || "Please try again");
      }
    } catch {}
  };

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>My Cart</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🛍️</Text>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyText}>Browse deals and add items to get started</Text>
          <TouchableOpacity testID="explore-btn" style={styles.exploreBtn} onPress={() => router.push("/(customer)")}>
            <Text style={styles.exploreBtnText}>Explore Deals</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>My Cart</Text>
        <TouchableOpacity testID="clear-cart-btn" onPress={() => Alert.alert("Clear Cart", "Remove all items?", [{ text: "Cancel", style: "cancel" }, { text: "Clear", style: "destructive", onPress: clearCart }])}>
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Vendor Info */}
        <View style={styles.vendorBanner}>
          <Text style={styles.vendorBannerText}>🏪 {vendorName}</Text>
        </View>

        {/* Reward Progress */}
        {rewardTiers.length > 0 && (
          <View style={styles.rewardSection}>
            <View style={styles.rewardHeader}>
              <Text style={styles.rewardTitle}>🎁 Reward Progress</Text>
              <Text style={styles.rewardAmount}>₹{Math.round(total)} spent</Text>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBg}>
                <LinearGradient
                  colors={progressColor as any}
                  style={[styles.progressFill, { width: `${progressPercent}%` }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </View>
              <Text style={styles.progressPct}>{Math.round(progressPercent)}%</Text>
            </View>

            {/* Tiers */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tiersRow}>
              {rewardTiers.map((tier) => {
                const isAchieved = total >= tier.threshold;
                const tierColor = (REWARD_COLORS[tier.color] || REWARD_COLORS.green)[0];
                return (
                  <View key={tier.tier_id} style={[styles.tierItem, isAchieved && { borderColor: tierColor }]}>
                    <View style={[styles.tierIcon, { backgroundColor: isAchieved ? tierColor : "#F1F5F9" }]}>
                      <Text style={styles.tierIconText}>{isAchieved ? "✓" : "🎁"}</Text>
                    </View>
                    <Text style={[styles.tierThreshold, { color: isAchieved ? tierColor : "#121212" }]}>₹{tier.threshold}</Text>
                    <Text style={styles.tierReward} numberOfLines={2}>{tier.reward}</Text>
                    {isAchieved && <Text style={[styles.tierAchieved, { color: tierColor }]}>Unlocked!</Text>}
                  </View>
                );
              })}
            </ScrollView>

            {nextTier && (
              <Text style={styles.nextTierText}>
                Spend ₹{Math.round(nextTier.threshold - total)} more to unlock: {nextTier.reward}
              </Text>
            )}
            {achievedTiers.length > 0 && !nextTier && (
              <Text style={[styles.nextTierText, { color: "#10B981" }]}>🎉 All rewards unlocked!</Text>
            )}
          </View>
        )}

        {/* Cart Items */}
        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>Items ({itemCount})</Text>
          {items.map((item) => (
            <View key={item.item_id} testID={`cart-item-${item.item_id}`} style={styles.cartItem}>
              <View style={styles.cartItemInfo}>
                <Text style={styles.cartItemName}>{item.name}</Text>
                <Text style={styles.cartItemPrice}>₹{item.price} each</Text>
              </View>
              <View style={styles.qtyControls}>
                <TouchableOpacity
                  testID={`decrease-${item.item_id}`}
                  style={styles.qtyBtn}
                  onPress={() => updateQuantity(item.item_id, item.quantity - 1)}
                >
                  <Ionicons name="remove" size={16} color="#FF5722" />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{item.quantity}</Text>
                <TouchableOpacity
                  testID={`increase-${item.item_id}`}
                  style={styles.qtyBtn}
                  onPress={() => updateQuantity(item.item_id, item.quantity + 1)}
                >
                  <Ionicons name="add" size={16} color="#FF5722" />
                </TouchableOpacity>
                <Text style={styles.cartItemTotal}>₹{Math.round(item.price * item.quantity)}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Bill Summary */}
        <View style={styles.billSection}>
          <Text style={styles.sectionTitle}>Bill Summary</Text>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Subtotal</Text>
            <Text style={styles.billValue}>₹{Math.round(total)}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Taxes & Fees</Text>
            <Text style={styles.billValue}>₹0</Text>
          </View>
          <View style={[styles.billRow, styles.billTotal]}>
            <Text style={styles.billTotalLabel}>Total to Pay</Text>
            <Text style={styles.billTotalValue}>₹{Math.round(total)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Checkout Button */}
      <View style={styles.checkoutContainer}>
        <TouchableOpacity
          testID="checkout-btn"
          style={styles.checkoutBtn}
          onPress={handleCheckout}
          disabled={checkingOut}
        >
          {checkingOut ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Text style={styles.checkoutBtnText}>Proceed to Pay</Text>
              <Text style={styles.checkoutAmount}>₹{Math.round(total)}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Razorpay Modal */}
      <Modal visible={showPayment} animationType="slide" onRequestClose={() => setShowPayment(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: "#0F172A" }}>
          <View style={styles.paymentHeader}>
            <TouchableOpacity onPress={() => setShowPayment(false)} style={styles.paymentCloseBtn}>
              <Ionicons name="close" size={24} color="#F8FAFC" />
            </TouchableOpacity>
            <Text style={styles.paymentTitle}>Secure Payment</Text>
          </View>
          <WebView
            source={{ html: getRazorpayHtml() }}
            onMessage={handleWebViewMessage}
            javaScriptEnabled
            domStorageEnabled
            style={{ flex: 1 }}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8F9FA" },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E2E8F0",
  },
  title: { fontSize: 22, fontWeight: "800", color: "#121212", letterSpacing: -0.5 },
  clearText: { fontSize: 14, color: "#EF4444", fontWeight: "600" },
  scroll: { padding: 16, paddingBottom: 120 },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#121212", marginBottom: 8 },
  emptyText: { fontSize: 14, color: "#64748B", textAlign: "center", marginBottom: 24 },
  exploreBtn: { backgroundColor: "#FF5722", borderRadius: 99, paddingHorizontal: 24, paddingVertical: 12 },
  exploreBtnText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
  vendorBanner: {
    backgroundColor: "#1E293B", borderRadius: 12, padding: 12, marginBottom: 16,
    flexDirection: "row", alignItems: "center",
  },
  vendorBannerText: { fontSize: 14, fontWeight: "700", color: "#F8FAFC" },
  rewardSection: {
    backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: "#E2E8F0",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  rewardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  rewardTitle: { fontSize: 16, fontWeight: "700", color: "#121212" },
  rewardAmount: { fontSize: 14, fontWeight: "700", color: "#FF5722" },
  progressContainer: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  progressBg: { flex: 1, height: 10, backgroundColor: "#F1F5F9", borderRadius: 99, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 99, minWidth: 4 },
  progressPct: { fontSize: 12, fontWeight: "700", color: "#64748B", width: 32, textAlign: "right" },
  tiersRow: { paddingBottom: 4, gap: 10 },
  tierItem: {
    width: 100, padding: 10, borderRadius: 12, backgroundColor: "#F8F9FA",
    borderWidth: 2, borderColor: "#E2E8F0", alignItems: "center",
  },
  tierIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  tierIconText: { fontSize: 14 },
  tierThreshold: { fontSize: 14, fontWeight: "800" },
  tierReward: { fontSize: 10, color: "#64748B", textAlign: "center", marginTop: 2 },
  tierAchieved: { fontSize: 10, fontWeight: "700", marginTop: 3 },
  nextTierText: { fontSize: 12, color: "#64748B", marginTop: 12, textAlign: "center" },
  itemsSection: { marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  cartItem: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF",
    borderRadius: 12, padding: 14, marginBottom: 8, gap: 12,
    borderWidth: 1, borderColor: "#E2E8F0",
  },
  cartItemInfo: { flex: 1 },
  cartItemName: { fontSize: 15, fontWeight: "700", color: "#121212" },
  cartItemPrice: { fontSize: 12, color: "#94A3B8", marginTop: 2 },
  qtyControls: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: "#F1F5F9",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#E2E8F0",
  },
  qtyText: { fontSize: 16, fontWeight: "800", color: "#121212", minWidth: 20, textAlign: "center" },
  cartItemTotal: { fontSize: 15, fontWeight: "800", color: "#121212", minWidth: 48, textAlign: "right" },
  billSection: {
    backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: "#E2E8F0",
  },
  billRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 },
  billLabel: { fontSize: 14, color: "#64748B" },
  billValue: { fontSize: 14, color: "#121212", fontWeight: "600" },
  billTotal: { borderTopWidth: 1, borderTopColor: "#E2E8F0", marginTop: 4 },
  billTotalLabel: { fontSize: 16, fontWeight: "800", color: "#121212" },
  billTotalValue: { fontSize: 20, fontWeight: "900", color: "#FF5722" },
  checkoutContainer: {
    position: "absolute", bottom: 0, left: 0, right: 0, padding: 16,
    backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#E2E8F0",
    paddingBottom: Platform.OS === "ios" ? 32 : 16,
  },
  checkoutBtn: {
    backgroundColor: "#FF5722", borderRadius: 16, height: 58,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 24,
    shadowColor: "#FF5722", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10,
  },
  checkoutBtnText: { fontSize: 17, fontWeight: "700", color: "#FFF" },
  checkoutAmount: { fontSize: 20, fontWeight: "900", color: "#FFF" },
  paymentHeader: {
    flexDirection: "row", alignItems: "center", padding: 16, gap: 12,
    backgroundColor: "#1E293B", borderBottomWidth: 1, borderBottomColor: "#334155",
  },
  paymentCloseBtn: { padding: 4 },
  paymentTitle: { fontSize: 18, fontWeight: "700", color: "#F8FAFC" },
});
