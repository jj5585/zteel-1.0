import { useState, useEffect } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import api from "../../utils/api";

export default function VendorMenu() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ name: "", description: "", price: "", category: "Main", is_available: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchMenu(); }, []);

  const fetchMenu = async () => {
    try {
      const data = await api.get("/api/vendor/menu");
      setItems(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
  };

  const openAdd = () => {
    setEditItem(null);
    setForm({ name: "", description: "", price: "", category: "Main", is_available: true });
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({ name: item.name, description: item.description || "", price: String(item.price), category: item.category, is_available: item.is_available });
    setShowModal(true);
  };

  const saveItem = async () => {
    if (!form.name || !form.price) {
      Alert.alert("Error", "Name and price are required");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, price: parseFloat(form.price) };
      if (editItem) {
        await api.put(`/api/vendor/menu/${editItem.item_id}`, payload);
      } else {
        await api.post("/api/vendor/menu", payload);
      }
      setShowModal(false);
      fetchMenu();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not save item");
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = (itemId: string) => {
    Alert.alert("Delete Item", "Remove this menu item?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => { await api.delete(`/api/vendor/menu/${itemId}`); fetchMenu(); } }
    ]);
  };

  const toggleAvailability = async (item: any) => {
    await api.put(`/api/vendor/menu/${item.item_id}`, { is_available: !item.is_available });
    fetchMenu();
  };

  if (loading) {
    return <SafeAreaView style={styles.safe}><View style={styles.center}><ActivityIndicator color="#3B82F6" /></View></SafeAreaView>;
  }

  const grouped = items.reduce((acc: any, item) => {
    acc[item.category] = acc[item.category] || [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Menu ({items.length})</Text>
        <TouchableOpacity testID="add-item-btn" style={styles.addBtn} onPress={openAdd}>
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.addBtnText}>Add Item</Text>
        </TouchableOpacity>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🍽️</Text>
          <Text style={styles.emptyTitle}>No menu items</Text>
          <Text style={styles.emptyText}>Add items to your menu so customers can order</Text>
          <TouchableOpacity testID="add-first-item-btn" style={styles.addFirstBtn} onPress={openAdd}>
            <Text style={styles.addFirstBtnText}>Add First Item</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {Object.keys(grouped).map((category) => (
            <View key={category}>
              <Text style={styles.categoryHeader}>{category}</Text>
              {grouped[category].map((item: any) => (
                <View key={item.item_id} testID={`menu-item-vendor-${item.item_id}`} style={[styles.menuItem, !item.is_available && styles.menuItemInactive]}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemDesc} numberOfLines={1}>{item.description}</Text>
                    <Text style={styles.itemPrice}>₹{item.price}</Text>
                  </View>
                  <View style={styles.itemActions}>
                    <TouchableOpacity
                      testID={`toggle-avail-${item.item_id}`}
                      style={[styles.availBtn, { backgroundColor: item.is_available ? "#10B981" : "#64748B" }]}
                      onPress={() => toggleAvailability(item)}
                    >
                      <Text style={styles.availBtnText}>{item.is_available ? "Active" : "Off"}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity testID={`edit-item-${item.item_id}`} onPress={() => openEdit(item)} style={styles.iconBtn}>
                      <Ionicons name="pencil" size={16} color="#3B82F6" />
                    </TouchableOpacity>
                    <TouchableOpacity testID={`delete-item-${item.item_id}`} onPress={() => deleteItem(item.item_id)} style={styles.iconBtn}>
                      <Ionicons name="trash" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add/Edit Modal */}
      <Modal visible={showModal} animationType="slide" onRequestClose={() => setShowModal(false)}>
        <SafeAreaView style={styles.modalSafe}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editItem ? "Edit Item" : "Add Menu Item"}</Text>
                <TouchableOpacity testID="close-modal-btn" onPress={() => setShowModal(false)}>
                  <Ionicons name="close" size={24} color="#F8FAFC" />
                </TouchableOpacity>
              </View>
              <ModalInput label="Item Name *" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholder="e.g., Butter Chicken" testID="item-name-input" />
              <ModalInput label="Description" value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} placeholder="Brief description" multiline testID="item-desc-input" />
              <ModalInput label="Price (₹) *" value={form.price} onChangeText={(v) => setForm({ ...form, price: v })} placeholder="280" keyboardType="decimal-pad" testID="item-price-input" />
              <ModalInput label="Category" value={form.category} onChangeText={(v) => setForm({ ...form, category: v })} placeholder="Main, Starter, Drinks, Dessert" testID="item-category-input" />

              <TouchableOpacity testID="save-item-btn" style={styles.saveBtn} onPress={saveItem} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>{editItem ? "Save Changes" : "Add to Menu"}</Text>}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function ModalInput({ label, value, onChangeText, placeholder, multiline, keyboardType, testID }: any) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ color: "#94A3B8", fontSize: 11, fontWeight: "700", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</Text>
      <TextInput
        testID={testID}
        style={[{ backgroundColor: "#1E293B", borderRadius: 10, paddingHorizontal: 14, height: multiline ? 80 : 52, fontSize: 15, color: "#F8FAFC", borderWidth: 1, borderColor: "#334155" }, multiline && { paddingTop: 12, textAlignVertical: "top" }]}
        placeholder={placeholder}
        placeholderTextColor="#64748B"
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType || "default"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0F172A" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#334155",
  },
  title: { fontSize: 22, fontWeight: "800", color: "#F8FAFC" },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#3B82F6", borderRadius: 99, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText: { fontSize: 14, fontWeight: "700", color: "#FFF" },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#F8FAFC", marginBottom: 8 },
  emptyText: { fontSize: 14, color: "#94A3B8", textAlign: "center", marginBottom: 24 },
  addFirstBtn: { backgroundColor: "#3B82F6", borderRadius: 99, paddingHorizontal: 24, paddingVertical: 12 },
  addFirstBtnText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
  scroll: { padding: 16, paddingBottom: 32 },
  categoryHeader: { fontSize: 11, fontWeight: "700", color: "#64748B", textTransform: "uppercase", letterSpacing: 1, paddingLeft: 4, marginBottom: 8, marginTop: 16 },
  menuItem: {
    backgroundColor: "#1E293B", borderRadius: 12, padding: 14, marginBottom: 8,
    flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#334155",
  },
  menuItemInactive: { opacity: 0.5 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: "700", color: "#F8FAFC" },
  itemDesc: { fontSize: 12, color: "#94A3B8", marginTop: 2 },
  itemPrice: { fontSize: 14, fontWeight: "800", color: "#3B82F6", marginTop: 4 },
  itemActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  availBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  availBtnText: { fontSize: 11, fontWeight: "700", color: "#FFF" },
  iconBtn: { padding: 6, backgroundColor: "#0F172A", borderRadius: 8 },
  modalSafe: { flex: 1, backgroundColor: "#0F172A" },
  modalScroll: { padding: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: "800", color: "#F8FAFC" },
  saveBtn: { backgroundColor: "#3B82F6", borderRadius: 14, height: 56, alignItems: "center", justifyContent: "center", marginTop: 8 },
  saveBtnText: { fontSize: 16, fontWeight: "700", color: "#FFF" },
});
