import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import PriceCard from '../../components/PriceCard';
import ProductCard from '../../components/ProductCard';

const API_URL = 'http://localhost:3000'; // Change to your backend URL

interface Price {
  id: string;
  effectivePrice: number;
  price: number;
  salePrice: number | null;
  inStock: boolean;
  store: {
    name: string;
    slug: string;
    address: string | null;
  };
}

interface Product {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  imageUrl: string | null;
}

interface ScanResult {
  product: Product;
  prices: Price[];
  bestPrice: Price | null;
}

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualBarcode, setManualBarcode] = useState('');

  const handleBarcodeScan = async ({ data }: { data: string }) => {
    if (loading) return;
    
    setScanning(false);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/scan/barcode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode: data }),
      });

      if (!response.ok) {
        throw new Error('Product not found');
      }

      const scanResult = await response.json();
      setResult(scanResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = () => {
    if (manualBarcode.trim()) {
      handleBarcodeScan({ data: manualBarcode.trim() });
    }
  };

  const resetScan = () => {
    setScanning(true);
    setResult(null);
    setError(null);
    setManualBarcode('');
  };

  if (!permission) {
    return <View style={styles.container}><ActivityIndicator /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Ionicons name="camera-outline" size={64} color="#6B7280" />
        <Text style={styles.permissionText}>Camera permission required</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {scanning ? (
        <View>
          <View style={styles.cameraContainer}>
            <CameraView
              style={styles.camera}
              barcodeScannerSettings={{
                barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
              }}
              onBarcodeScanned={handleBarcodeScan}
            />
            <View style={styles.overlay}>
              <View style={styles.scanArea} />
            </View>
          </View>

          <View style={styles.manualEntry}>
            <Text style={styles.orText}>or enter barcode manually</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Enter barcode..."
                value={manualBarcode}
                onChangeText={setManualBarcode}
                keyboardType="numeric"
              />
              <TouchableOpacity style={styles.submitBtn} onPress={handleManualSubmit}>
                <Ionicons name="search" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Looking up product...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.button} onPress={resetScan}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : result ? (
        <View style={styles.results}>
          <ProductCard product={result.product} />

          <Text style={styles.sectionTitle}>Prices ({result.prices.length} stores)</Text>

          {result.prices.map((price, index) => (
            <PriceCard key={price.id} price={price} isBest={index === 0} />
          ))}

          <TouchableOpacity style={styles.scanAgainBtn} onPress={resetScan}>
            <Ionicons name="barcode-outline" size={20} color="#FFF" />
            <Text style={styles.scanAgainText}>Scan Another</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, minHeight: 400 },
  cameraContainer: { height: 300, position: 'relative' },
  camera: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  scanArea: { width: 250, height: 150, borderWidth: 2, borderColor: '#10B981', borderRadius: 8, backgroundColor: 'transparent' },
  manualEntry: { padding: 20, backgroundColor: '#FFF' },
  orText: { textAlign: 'center', color: '#6B7280', marginBottom: 12 },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, fontSize: 16 },
  submitBtn: { backgroundColor: '#10B981', borderRadius: 8, padding: 12, justifyContent: 'center' },
  permissionText: { fontSize: 16, color: '#6B7280', marginTop: 12, marginBottom: 20 },
  button: { backgroundColor: '#10B981', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  buttonText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
  loadingText: { marginTop: 12, color: '#6B7280' },
  errorText: { fontSize: 16, color: '#EF4444', marginTop: 12, marginBottom: 20 },
  results: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginTop: 20, marginBottom: 12 },
  scanAgainBtn: { flexDirection: 'row', backgroundColor: '#10B981', padding: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 20 },
  scanAgainText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
});
