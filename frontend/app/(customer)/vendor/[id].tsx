import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert, Platform
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCart } from "../../../contexts/CartContext";
import api from "../../../utils/api";

const CATEGORY_EMOJI: Record<string, string> = {
  restaurant: "🍽️", juice_bar: "🥤", grocery: "🛒",
  cafe: "☕", bakery: "🥐", pharmacy: "💊", other: "🏪",
};

const REWARD_COLORS: Record<string, string> = {
  green: "#10B981", yellow: "#F59E0B", orange: "#FF5722",
};

export default function VendorDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { addItem, items: cartItems, total: cartTotal, itemCount, vendorId, updateQuantity } = useCart();

  const [vendor, setVendor] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    if (id) fetchAll();
  }, [id]);

  const fetchAll = useCallback(async () => {
    try {
      const [vendorData, menuData, dealsData, rewardsData] = await Promise.all([
        api.get(`/api/customer/vendors/${id}`),
        api.get(`/api/customer/vendors/${id}/menu`),
        api.get(`/api/customer/vendors/${id}/deals`),
        api.get(`/api/customer/vendors/${id}/rewards`),
      ]);
      setVendor(vendorData);
      setMenuItems(Array.isArray(menuData) ? menuData : []);
      setDeals(Array.isArray(dealsData) ? dealsData : []);
      setRewards(Array.isArray(rewardsData) ? rewardsData : []);
    } catch {
      Alert.alert("Error", "Could not load vendor details");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  const handleAddToCart = (item: any) => {
    if (vendorId && vendorId !== id) {
      Alert.alert(
        "New Vendor",
        "Adding this will clear your existing cart from another vendor.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Clear & Add",
            onPress: () => addItem(
              { item_id: item.item_id, vendor_id: id as string, name: item.name, price: item.price, quantity: 1 },
              vendor?.store_name || ""
            )
          }
        ]
      );
      return;
    }
    addItem(
      { item_id: item.item_id, vendor_id: id as string, name: item.name, price: item.price, quantity: 1 },
      vendor?.store_name || ""
    );
  };

  const getItemQty = (itemId: string) => {
    const found = cartItems.find((ci) => ci.item_id === itemId);
    return found ? found.quantity : 0;
  };

  const categories = ["All", ...Array.from(new Set(menuItems.map((i) => i.category)))];
  const filteredItems = activeCategory === "All" ? menuItems : menuItems.filter((i) => i.category === activeCategory);

  const bestDeal = deals.find((d) => d.is_active);
  const bestDiscount = bestDeal ? (bestDeal.current_discount || bestDeal.discount_percentage) : 0;

  // Reward progress for this vendor
  const isThisVendor = vendorId === id;
  const nextReward = rewards.find((r) => cartTotal < r.threshold);
  const achievedRewards = rewards.filter((r) => cartTotal >= r.threshold);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF5722" />
        </View>
      </SafeAreaView>
    );
  }

  if (!vendor) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Vendor not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.goBackBtn}>
            <Text style={styles.goBackText}>← Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity testID="back-btn" onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#121212" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{vendor.store_name}</Text>
        <TouchableOpacity testID="cart-header-btn" onPress={() => router.push("/(customer)/cart")} style={styles.cartBtn}>
          <Ionicons name="bag-outline" size={22} color="#121212" />
          {itemCount > 0 && (
            <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{itemCount}</Text></View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: itemCount > 0 && isThisVendor ? 100 : 32 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF5722" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Vendor Hero */}
        <LinearGradient colors={["#1E293B", "#0F172A"]} style={styles.hero}>
          <View style={styles.heroIcon}>
            <Text style={styles.heroEmoji}>{CATEGORY_EMOJI[vendor.category] || "🏪"}</Text>
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>{vendor.store_name}</Text>
            <Text style={styles.heroDesc} numberOfLines={2}>{vendor.description}</Text>
            <View style={styles.heroMeta}>
              <View style={styles.heroMetaItem}>
                <Ionicons name="time-outline" size={12} color="#94A3B8" />
                <Text style={styles.heroMetaText}>{vendor.opening_time} – {vendor.closing_time}</Text>
              </View>
              <View style={styles.heroDot} />
              <Text style={styles.heroMetaText} numberOfLines={1}>{vendor.address?.split(",")[0]}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Active Deals */}
        {deals.filter((d) => d.is_active).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Deals</Text>
            {deals.filter((d) => d.is_active).map((deal) => (
              <View
                key={deal.deal_id}
                style={[styles.dealCard, { backgroundColor: deal.type === "slow_hour" ? "#ECFDF5" : "#FFF7ED" }]}
              >
                <View style={styles.dealCardLeft}>
                  <Text style={[styles.dealCardTitle, { color: deal.type === "slow_hour" ? "#065F46" : "#9A3412" }]}>
                    {deal.type === "slow_hour" ? "⏰ " : "🔥 "}{deal.title}
                  </Text>
                  <Text style={styles.dealCardDesc}>{deal.description}</Text>
                  {deal.start_time && (
                    <Text style={styles.dealCardTime}>{deal.start_time} – {deal.end_time}</Text>
                  )}
                  {deal.type === "clearance" && (
                    <Text style={styles.dealCardAutoIncrease}>Discount auto-increases near closing ↑</Text>
                  )}
                </View>
                <View style={[styles.dealBadge, { backgroundColor: deal.type === "slow_hour" ? "#10B981" : "#FF5722" }]}>
                  <Text style={styles.dealBadgeText}>{Math.round(deal.current_discount || deal.discount_percentage)}%</Text>
                  <Text style={styles.dealBadgeOff}>OFF</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Reward Progress (only if cart from this vendor has items) */}
        {rewards.length > 0 && isThisVendor && cartTotal > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎁 Reward Progress</Text>
            <View style={styles.rewardCard}>
              <View style={styles.rewardTopRow}>
                <Text style={styles.rewardSpent}>₹{Math.round(cartTotal)} spent</Text>
                {nextReward ? (
                  <Text style={styles.rewardNextLabel}>
                    ₹{Math.round(nextReward.threshold - cartTotal)} more → {nextReward.reward}
                  </Text>
                ) : (
                  <Text style={[styles.rewardNextLabel, { color: "#10B981" }]}>🎉 All rewards unlocked!</Text>
                )}
              </View>
              {/* Progress bar */}
              <View style={styles.rewardBarBg}>
                <View style={[styles.rewardBarFill, {
                  width: `${nextReward
                    ? Math.min(100, ((cartTotal / nextReward.threshold) * 100))
                    : 100}%`,
                  backgroundColor: nextReward ? (REWARD_COLORS[nextReward.color] || "#FF5722") : "#10B981"
                }]} />
              </View>
              {/* Tiers */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tiersRow}>
                {rewards.map((tier) => {
                  const achieved = cartTotal >= tier.threshold;
                  const color = REWARD_COLORS[tier.color] || "#10B981";
                  return (
                    <View key={tier.tier_id} style={[styles.tierChip, achieved && { borderColor: color, backgroundColor: `${color}15` }]}>
                      <Text style={[styles.tierAmount, { color: achieved ? color : "#64748B" }]}>₹{tier.threshold}</Text>
                      <Text style={styles.tierReward} numberOfLines={2}>{tier.reward}</Text>
                      {achieved && <Text style={[styles.tierAchieved, { color }]}>✓ Unlocked</Text>}
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        )}

        {/* Category Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.catBar}
          contentContainerStyle={styles.catBarContent}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              testID={`cat-${cat}`}
              key={cat}
              style={[styles.catTab, activeCategory === cat && styles.catTabActive]}
              onPress={() => setActiveCategory(cat)}
            >
              <Text style={[styles.catTabText, activeCategory === cat && styles.catTabTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {filteredItems.length === 0 ? (
            <View style={styles.emptyMenu}>
              <Text style={styles.emptyMenuText}>No items in this category</Text>
            </View>
          ) : filteredItems.map((item) => {
            const qty = getItemQty(item.item_id);
            const discountedPrice = bestDiscount > 0
              ? Math.round(item.price * (1 - bestDiscount / 100))
              : null;
            return (
              <View key={item.item_id} testID={`menu-item-${item.item_id}`} style={styles.menuItem}>
                <View style={styles.menuItemInfo}>
                  <View style={styles.menuItemNameRow}>
                    <Text style={styles.menuItemName}>{item.name}</Text>
                    {discountedPrice && discountedPrice < item.price && (
                      <View style={styles.discountTag}>
                        <Text style={styles.discountTagText}>{Math.round(bestDiscount)}% OFF</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.menuItemDesc} numberOfLines={2}>{item.description}</Text>
                  <View style={styles.priceRow}>
                    {discountedPrice && discountedPrice < item.price ? (
                      <>
                        <Text style={styles.originalPrice}>₹{item.price}</Text>
                        <Text style={styles.discountedPrice}>₹{discountedPrice}</Text>
                      </>
                    ) : (
                      <Text style={styles.menuItemPrice}>₹{item.price}</Text>
                    )}
                  </View>
                </View>

                {/* Add/Qty */}
                {qty === 0 ? (
                  <TouchableOpacity
                    testID={`add-${item.item_id}`}
                    style={styles.addBtn}
                    onPress={() => handleAddToCart(item)}
                  >
                    <Ionicons name="add" size={22} color="#FFF" />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.qtyRow}>
                    <TouchableOpacity
                      testID={`dec-${item.item_id}`}
                      style={styles.qtyBtn}
                      onPress={() => updateQuantity(item.item_id, qty - 1)}
                    >
                      <Ionicons name="remove" size={16} color="#FF5722" />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{qty}</Text>
                    <TouchableOpacity
                      testID={`inc-${item.item_id}`}
                      style={styles.qtyBtn}
                      onPress={() => handleAddToCart(item)}
                    >
                      <Ionicons name="add" size={16} color="#FF5722" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Sticky Cart Bar */}
      {itemCount > 0 && isThisVendor && (
        <View style={styles.cartBar}>
          <View style={styles.cartBarLeft}>
            <View style={styles.cartCount}>
              <Text style={styles.cartCountText}>{itemCount}</Text>
            </View>
            <Text style={styles.cartBarInfo}>{itemCount} item{itemCount > 1 ? "s" : ""}</Text>
          </View>
          <TouchableOpacity testID="view-cart-btn" style={styles.cartBarBtn} onPress={() => router.push("/(customer)/cart")}>
            <Text style={styles.cartBarBtnText}>View Cart · ₹{Math.round(cartTotal)}</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8F9FA" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { fontSize: 18, color: "#EF4444" },
  goBackBtn: { backgroundColor: "#F1F5F9", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 99 },
  goBackText: { fontSize: 15, fontWeight: "700", color: "#121212" },

  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "#E2E8F0", gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: "800", color: "#121212", letterSpacing: -0.3 },
  cartBtn: { padding: 4 },
  cartBadge: {
    position: "absolute", top: -3, right: -5, backgroundColor: "#FF5722",
    width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center",
  },
  cartBadgeText: { fontSize: 9, fontWeight: "900", color: "#FFF" },

  scroll: { paddingBottom: 32 },

  hero: { padding: 20, flexDirection: "row", gap: 14, alignItems: "flex-start" },
  heroIcon: {
    width: 64, height: 64, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  heroEmoji: { fontSize: 30 },
  heroInfo: { flex: 1 },
  heroName: { fontSize: 20, fontWeight: "900", color: "#F8FAFC", letterSpacing: -0.5, marginBottom: 4 },
  heroDesc: { fontSize: 13, color: "#94A3B8", lineHeight: 18, marginBottom: 8 },
  heroMeta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  heroMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  heroMetaText: { fontSize: 12, color: "#94A3B8" },
  heroDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: "#475569" },

  section: { paddingHorizontal: 16, paddingTop: 16 },
  sectionTitle: { fontSize: 12, fontWeight: "700", color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 },

  dealCard: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderRadius: 12, padding: 14, marginBottom: 8, gap: 10,
  },
  dealCardLeft: { flex: 1 },
  dealCardTitle: { fontSize: 14, fontWeight: "800", marginBottom: 3 },
  dealCardDesc: { fontSize: 12, color: "#64748B", marginBottom: 4 },
  dealCardTime: { fontSize: 11, color: "#94A3B8" },
  dealCardAutoIncrease: { fontSize: 10, color: "#FF5722", fontWeight: "600", marginTop: 2 },
  dealBadge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignItems: "center", minWidth: 60 },
  dealBadgeText: { fontSize: 18, fontWeight: "900", color: "#FFF" },
  dealBadgeOff: { fontSize: 9, color: "rgba(255,255,255,0.9)", fontWeight: "700" },

  rewardCard: {
    backgroundColor: "#FFF", borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: "#E2E8F0",
  },
  rewardTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  rewardSpent: { fontSize: 14, fontWeight: "800", color: "#FF5722" },
  rewardNextLabel: { fontSize: 12, color: "#64748B", flex: 1, textAlign: "right" },
  rewardBarBg: { height: 6, backgroundColor: "#F1F5F9", borderRadius: 99, overflow: "hidden", marginBottom: 14 },
  rewardBarFill: { height: "100%", borderRadius: 99 },
  tiersRow: { gap: 8, paddingBottom: 2 },
  tierChip: {
    width: 90, padding: 8, borderRadius: 10, backgroundColor: "#F8F9FA",
    borderWidth: 2, borderColor: "#E2E8F0", alignItems: "center",
  },
  tierAmount: { fontSize: 14, fontWeight: "800", marginBottom: 2 },
  tierReward: { fontSize: 10, color: "#64748B", textAlign: "center" },
  tierAchieved: { fontSize: 10, fontWeight: "700", marginTop: 3 },

  catBar: { backgroundColor: "#FFF", marginTop: 16, borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  catBarContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  catTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 99, backgroundColor: "#F1F5F9" },
  catTabActive: { backgroundColor: "#FF5722" },
  catTabText: { fontSize: 13, fontWeight: "600", color: "#64748B" },
  catTabTextActive: { color: "#FFF" },

  menuSection: { padding: 16 },
  emptyMenu: { paddingVertical: 40, alignItems: "center" },
  emptyMenuText: { color: "#94A3B8", fontSize: 14 },

  menuItem: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#FFF",
    borderRadius: 14, padding: 14, marginBottom: 10, gap: 12,
    borderWidth: 1, borderColor: "#E2E8F0",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  menuItemInfo: { flex: 1 },
  menuItemNameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 },
  menuItemName: { flex: 1, fontSize: 15, fontWeight: "700", color: "#121212" },
  discountTag: { backgroundColor: "#FFF3E0", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  discountTagText: { fontSize: 10, fontWeight: "700", color: "#FF5722" },
  menuItemDesc: { fontSize: 12, color: "#94A3B8", lineHeight: 16, marginBottom: 6 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  menuItemPrice: { fontSize: 16, fontWeight: "800", color: "#121212" },
  originalPrice: { fontSize: 13, color: "#94A3B8", textDecorationLine: "line-through" },
  discountedPrice: { fontSize: 16, fontWeight: "800", color: "#FF5722" },

  addBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: "#FF5722",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#FF5722", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  qtyRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#FFF3E0", borderRadius: 99, paddingHorizontal: 8, paddingVertical: 4,
  },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center" },
  qtyText: { fontSize: 15, fontWeight: "800", color: "#FF5722", minWidth: 18, textAlign: "center" },

  cartBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#FFF", borderTopWidth: 1, borderTopColor: "#E2E8F0",
    flexDirection: "row", alignItems: "center", padding: 12, gap: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 12,
  },
  cartBarLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  cartCount: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: "#FF5722",
    alignItems: "center", justifyContent: "center",
  },
  cartCountText: { fontSize: 12, fontWeight: "900", color: "#FFF" },
  cartBarInfo: { fontSize: 13, color: "#64748B", fontWeight: "600" },
  cartBarBtn: {
    flex: 1, backgroundColor: "#FF5722", borderRadius: 12, height: 46,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  cartBarBtnText: { fontSize: 14, fontWeight: "700", color: "#FFF" },
});
