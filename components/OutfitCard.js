import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const OutfitCard = ({ outfit, index, onBuyPress }) => {
  return (
    <View style={styles.card}>
      <View style={styles.content}>
        <Text style={styles.title}>Outfit #{index + 1}: {outfit.style || 'Everyday Wear'}</Text>
        <Text style={styles.reason}>{outfit.description}</Text>
        <Text style={styles.occasion}>Ideal for: {outfit.occasion}</Text>
        <View style={styles.footer}>
          {/* If price is placeholder or empty, don't show or show differently */}
          <Text style={styles.price}>{outfit.price && outfit.price !== '$--' ? outfit.price : ''}</Text>
          <TouchableOpacity style={styles.buyButton} onPress={onBuyPress}>
            <Text style={styles.buyButtonText}>Shop Similar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  content: {
    padding: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  reason: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
    marginBottom: 8,
  },
  occasion: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  buyButton: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  buyButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default OutfitCard;
