import { useState, useRef } from 'react';
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

// Ontario FSAs start with K, L, M, N, or P
// Validated against the space-stripped form (always 6 chars)
const ONTARIO_POSTAL_REGEX = /^[KLMNP][0-9][A-Z][0-9][A-Z][0-9]$/i;

// Expects exactly 6 chars (no spaces)
function formatPostalCode(stripped: string): string {
  const clean = stripped.toUpperCase();
  return `${clean.slice(0, 3)} ${clean.slice(3)}`;
}

function isValidOntarioPostal(code: string): boolean {
  return ONTARIO_POSTAL_REGEX.test(code);
}

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

  // Postal code state
  const [postalInput, setPostalInput] = useState('');
  const [postalCode, setPostalCode] = useState<string | null>(null);
  const [postalArea, setPostalArea] = useState<string | null>(null); // shown during typing (FSA-level hint)
  const [lockedLocation, setLockedLocation] = useState<string | null>(null); // "Location secured" after full code
  const [postalError, setPostalError] = useState<string | null>(null);
  const [postalLoading, setPostalLoading] = useState(false);
  const postalDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFsaRef = useRef<string | null>(null);

  const geocodePostal = async (alphanum: string): Promise<string | null> => {
    try {
      const res = await fetch(`https://geocoder.ca/?postal=${alphanum}&json=1`);
      if (!res.ok) return null;
      const data = await res.json();
      if (data?.standard?.city) {
        return `${data.standard.city}, ${data.standard.prov ?? 'ON'}`;
      }
    } catch {}
    return null;
  };

  const handlePostalChange = (text: string) => {
    // Strip everything except letters and digits, cap at 6 alphanum chars
    const alphanum = text.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6);

    // Auto-format: insert space after 3rd char once we have 4+
    const formatted = alphanum.length > 3
      ? `${alphanum.slice(0, 3)} ${alphanum.slice(3)}`
      : alphanum;

    setPostalInput(formatted);
    setPostalError(null);
    setLockedLocation(null);
    setPostalCode(null);

    if (postalDebounce.current) clearTimeout(postalDebounce.current);

    if (alphanum.length === 0) {
      setPostalArea(null);
      lastFsaRef.current = null;
      return;
    }

    // Immediate first-character check
    if (!/^[KLMNP]/i.test(alphanum)) {
      setPostalError('Ontario postal codes start with K, L, M, N, or P');
      setPostalArea(null);
      lastFsaRef.current = null;
      return;
    }

    const fsa = alphanum.slice(0, 3);

    // Fetch area hint as soon as we have a full FSA (3 chars)
    if (alphanum.length >= 3 && fsa !== lastFsaRef.current) {
      lastFsaRef.current = fsa;
      setPostalLoading(true);
      geocodePostal(fsa).then((area) => {
        setPostalArea(area);
        setPostalLoading(false);
      });
    }

    if (alphanum.length < 6) return;

    // Full validation once we have all 6 chars
    postalDebounce.current = setTimeout(async () => {
      if (!isValidOntarioPostal(alphanum)) {
        setPostalError('Must be a valid Ontario postal code (e.g. M5V 3A1)');
        return;
      }

      const display = formatPostalCode(alphanum);
      setPostalInput(display);
      setPostalCode(display);

      // Reuse FSA area if already fetched, else fetch full postal
      if (postalArea) {
        setLockedLocation(postalArea);
      } else {
        setPostalLoading(true);
        const area = await geocodePostal(alphanum);
        setPostalArea(area);
        setLockedLocation(area);
        setPostalLoading(false);
      }
    }, 400);
  };

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
          {/* Postal Code Section */}
          <View style={styles.postalSection}>
            <Text style={styles.postalLabel}>Your Ontario Postal Code</Text>
            <View style={styles.postalRow}>
              <TextInput
                style={[
                  styles.postalInput,
                  postalError ? styles.postalInputError : null,
                  postalCode ? styles.postalInputValid : null,
                ]}
                placeholder="e.g. M5V 3A1"
                placeholderTextColor="#9CA3AF"
                value={postalInput}
                onChangeText={handlePostalChange}
                autoCapitalize="characters"
                maxLength={7}
              />
              {postalLoading && <ActivityIndicator style={styles.postalSpinner} color="#10B981" />}
              {postalCode && !postalLoading && (
                <Ionicons name="checkmark-circle" size={22} color="#10B981" style={styles.postalSpinner} />
              )}
            </View>
            {postalError ? (
              <Text style={styles.postalErrorText}>{postalError}</Text>
            ) : lockedLocation ? (
              <View style={styles.lockedBanner}>
                <Ionicons name="lock-closed" size={13} color="#059669" />
                <Text style={styles.lockedText}>Location secured · {lockedLocation}</Text>
              </View>
            ) : postalArea ? (
              <View style={styles.areaHint}>
                <Ionicons name="location-outline" size={13} color="#6B7280" />
                <Text style={styles.areaHintText}>{postalArea}</Text>
              </View>
            ) : null}
          </View>

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
  postalSection: { backgroundColor: '#FFF', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  postalLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  postalRow: { flexDirection: 'row', alignItems: 'center' },
  postalInput: { flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, letterSpacing: 1, color: '#111827' },
  postalInputError: { borderColor: '#EF4444' },
  postalInputValid: { borderColor: '#10B981' },
  postalSpinner: { marginLeft: 10 },
  postalErrorText: { fontSize: 12, color: '#EF4444', marginTop: 6 },
  areaHint: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  areaHintText: { fontSize: 12, color: '#6B7280' },
  lockedBanner: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, backgroundColor: '#D1FAE5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, alignSelf: 'flex-start' },
  lockedText: { fontSize: 12, color: '#059669', fontWeight: '600' },
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
