import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Price {
  id: string;
  effectivePrice: number;
  price: number;
  salePrice: number | null;
  inStock: boolean;
  distance?: number | null;
  store: {
    name: string;
    slug: string;
    address: string | null;
  };
}

interface PriceCardProps {
  price: Price;
  isBest?: boolean;
  onAddToCart?: () => void;
}

export default function PriceCard({ price, isBest = false, onAddToCart }: PriceCardProps) {
  const isOnSale = price.salePrice !== null;

  return (
    <View style={[styles.card, isBest && styles.bestCard]}>
      {isBest && (
        <View style={styles.bestBadge}>
          <Ionicons name="trophy" size={12} color="#FFF" />
          <Text style={styles.bestText}>BEST PRICE</Text>
        </View>
      )}

      <View style={styles.row}>
        <View style={styles.storeInfo}>
          <Text style={styles.storeName}>{price.store.name}</Text>
          {price.store.address && (
            <Text style={styles.storeAddress} numberOfLines={1}>
              {price.store.address}
            </Text>
          )}
        </View>

        <View style={styles.priceInfo}>
          {isOnSale && (
            <Text style={styles.originalPrice}>${price.price.toFixed(2)}</Text>
          )}
          <Text style={[styles.price, isOnSale && styles.salePrice]}>
            ${price.effectivePrice.toFixed(2)}
          </Text>
          {isOnSale && (
            <View style={styles.saleBadge}>
              <Text style={styles.saleText}>SALE</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.stockStatus}>
          <View style={[styles.stockDot, price.inStock ? styles.inStock : styles.outOfStock]} />
          <Text style={styles.stockText}>
            {price.inStock ? 'In Stock' : 'Out of Stock'}
          </Text>
          {price.distance != null && (
            <View style={styles.distanceBadge}>
              <Ionicons name="navigate-outline" size={11} color="#6B7280" />
              <Text style={styles.distanceText}>{price.distance} km</Text>
            </View>
          )}
        </View>

        {onAddToCart && (
          <TouchableOpacity style={styles.addButton} onPress={onAddToCart}>
            <Ionicons name="add" size={18} color="#FFF" />
            <Text style={styles.addText}>Add to Cart</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  bestCard: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF9',
  },
  bestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 12,
    gap: 4,
  },
  bestText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  storeAddress: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  priceInfo: {
    alignItems: 'flex-end',
  },
  originalPrice: {
    fontSize: 14,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  price: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  salePrice: {
    color: '#DC2626',
  },
  saleBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  saleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  stockStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  inStock: {
    backgroundColor: '#10B981',
  },
  outOfStock: {
    backgroundColor: '#EF4444',
  },
  stockText: {
    fontSize: 12,
    color: '#6B7280',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    gap: 3,
  },
  distanceText: {
    fontSize: 11,
    color: '#6B7280',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  addText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
});
