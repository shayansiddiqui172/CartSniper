import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const API_URL = 'http://localhost:3000';
const USER_ID = 'demo-user-123'; // In production, get from auth

interface CartItem {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    brand: string | null;
  };
}

interface Optimization {
  singleStore: {
    store: { name: string };
    total: number;
    savings: number;
  };
  splitTrip: {
    stores: { name: string; items: string[]; subtotal: number }[];
    total: number;
    savings: number;
  } | null;
  recommendation: 'single' | 'split';
}

interface Cart {
  id: string;
  items: CartItem[];
  optimization: Optimization | null;
}

export default function CartScreen() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCart = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/cart`, {
        headers: { 'x-user-id': USER_ID },
      });

      if (response.ok) {
        const data = await response.json();
        setCart(data);
      }
    } catch (err) {
      console.error('Failed to fetch cart:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCart();
  };

  const removeItem = async (itemId: string) => {
    try {
      await fetch(`${API_URL}/cart/items/${itemId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': USER_ID },
      });
      fetchCart();
    } catch (err) {
      console.error('Failed to remove item:', err);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  const items = cart?.items || [];
  const optimization = cart?.optimization;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="cart-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>
            Scan products to add them to your cart
          </Text>
        </View>
      ) : (
        <>
          {/* Cart Items */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Items ({items.length})</Text>
            {items.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.product.name}</Text>
                  {item.product.brand && (
                    <Text style={styles.itemBrand}>{item.product.brand}</Text>
                  )}
                  <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
                </View>
                <TouchableOpacity onPress={() => removeItem(item.id)}>
                  <Ionicons name="trash-outline" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Optimization Results */}
          {optimization && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Best Options</Text>

              {/* Single Store Option */}
              <View style={[styles.optionCard, optimization.recommendation === 'single' && styles.recommended]}>
                {optimization.recommendation === 'single' && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>RECOMMENDED</Text>
                  </View>
                )}
                <Text style={styles.optionTitle}>All at {optimization.singleStore.store.name}</Text>
                <Text style={styles.optionTotal}>${optimization.singleStore.total.toFixed(2)}</Text>
                {optimization.singleStore.savings > 0 && (
                  <Text style={styles.savings}>
                    Save ${optimization.singleStore.savings.toFixed(2)} vs. other stores
                  </Text>
                )}
              </View>

              {/* Split Trip Option */}
              {optimization.splitTrip && optimization.splitTrip.stores.length > 1 && (
                <View style={[styles.optionCard, optimization.recommendation === 'split' && styles.recommended]}>
                  {optimization.recommendation === 'split' && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>RECOMMENDED</Text>
                    </View>
                  )}
                  <Text style={styles.optionTitle}>Split Between Stores</Text>
                  <Text style={styles.optionTotal}>${optimization.splitTrip.total.toFixed(2)}</Text>
                  
                  {optimization.splitTrip.stores.map((store, index) => (
                    <View key={index} style={styles.storeBreakdown}>
                      <Text style={styles.storeName}>{store.name}</Text>
                      <Text style={styles.storeItems}>{store.items.join(', ')}</Text>
                      <Text style={styles.storeSubtotal}>${store.subtotal.toFixed(2)}</Text>
                    </View>
                  ))}
                  
                  {optimization.splitTrip.savings > 0 && (
                    <Text style={styles.savings}>
                      Save ${optimization.splitTrip.savings.toFixed(2)} extra
                    </Text>
                  )}
                </View>
              )}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 100 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#374151', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#6B7280', marginTop: 8, textAlign: 'center' },
  section: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  itemCard: { backgroundColor: '#FFF', borderRadius: 8, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '500' },
  itemBrand: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  itemQty: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  optionCard: { backgroundColor: '#FFF', borderRadius: 8, padding: 16, marginBottom: 12, borderWidth: 2, borderColor: 'transparent' },
  recommended: { borderColor: '#10B981' },
  badge: { backgroundColor: '#10B981', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginBottom: 8 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  optionTitle: { fontSize: 16, fontWeight: '600' },
  optionTotal: { fontSize: 28, fontWeight: '700', color: '#10B981', marginTop: 4 },
  savings: { fontSize: 14, color: '#10B981', marginTop: 8 },
  storeBreakdown: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  storeName: { fontSize: 14, fontWeight: '600' },
  storeItems: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  storeSubtotal: { fontSize: 14, fontWeight: '500', marginTop: 4 },
});
