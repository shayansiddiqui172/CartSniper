import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const API_URL = 'http://localhost:3000';
const USER_ID = 'demo-user-123';

interface PriceAlert {
  id: string;
  targetPrice: number;
  triggered: boolean;
  triggeredAt: string | null;
  product: {
    id: string;
    name: string;
    brand: string | null;
  };
}

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAlerts = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/alerts`, {
        headers: { 'x-user-id': USER_ID },
      });

      if (response.ok) {
        const data = await response.json();
        setAlerts(data);
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAlerts();
  };

  const deleteAlert = async (alertId: string) => {
    Alert.alert(
      'Delete Alert',
      'Are you sure you want to delete this price alert?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetch(`${API_URL}/alerts/${alertId}`, {
                method: 'DELETE',
                headers: { 'x-user-id': USER_ID },
              });
              fetchAlerts();
            } catch (err) {
              console.error('Failed to delete alert:', err);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  const activeAlerts = alerts.filter((a) => !a.triggered);
  const triggeredAlerts = alerts.filter((a) => a.triggered);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {alerts.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="notifications-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No price alerts</Text>
          <Text style={styles.emptySubtitle}>
            Scan a product and set a target price to get notified when it drops
          </Text>
        </View>
      ) : (
        <>
          {/* Active Alerts */}
          {activeAlerts.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Active Alerts ({activeAlerts.length})</Text>
              {activeAlerts.map((alert) => (
                <View key={alert.id} style={styles.alertCard}>
                  <View style={styles.alertIcon}>
                    <Ionicons name="notifications" size={24} color="#10B981" />
                  </View>
                  <View style={styles.alertInfo}>
                    <Text style={styles.alertProduct}>{alert.product.name}</Text>
                    {alert.product.brand && (
                      <Text style={styles.alertBrand}>{alert.product.brand}</Text>
                    )}
                    <View style={styles.targetRow}>
                      <Text style={styles.targetLabel}>Notify when below</Text>
                      <Text style={styles.targetPrice}>${alert.targetPrice.toFixed(2)}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => deleteAlert(alert.id)}>
                    <Ionicons name="close-circle" size={28} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Triggered Alerts */}
          {triggeredAlerts.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Triggered ({triggeredAlerts.length})</Text>
              {triggeredAlerts.map((alert) => (
                <View key={alert.id} style={[styles.alertCard, styles.triggeredCard]}>
                  <View style={[styles.alertIcon, styles.triggeredIcon]}>
                    <Ionicons name="checkmark-circle" size={24} color="#FFF" />
                  </View>
                  <View style={styles.alertInfo}>
                    <Text style={styles.alertProduct}>{alert.product.name}</Text>
                    <Text style={styles.triggeredText}>
                      Price dropped below ${alert.targetPrice.toFixed(2)}!
                    </Text>
                    {alert.triggeredAt && (
                      <Text style={styles.triggeredDate}>
                        {new Date(alert.triggeredAt).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => deleteAlert(alert.id)}>
                    <Ionicons name="close-circle" size={28} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              ))}
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
  alertCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  triggeredCard: { borderWidth: 2, borderColor: '#10B981' },
  alertIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  triggeredIcon: { backgroundColor: '#10B981' },
  alertInfo: { flex: 1 },
  alertProduct: { fontSize: 16, fontWeight: '500' },
  alertBrand: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  targetRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  targetLabel: { fontSize: 12, color: '#6B7280' },
  targetPrice: { fontSize: 16, fontWeight: '700', color: '#10B981', marginLeft: 8 },
  triggeredText: { fontSize: 14, color: '#10B981', fontWeight: '500', marginTop: 4 },
  triggeredDate: { fontSize: 12, color: '#6B7280', marginTop: 2 },
});
