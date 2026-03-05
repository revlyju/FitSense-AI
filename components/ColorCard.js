import { StyleSheet, Text, View } from 'react-native';

const ColorCard = ({ color }) => {
  return (
    <View style={styles.card}>
      <View
        style={[
          styles.colorBox,
          { backgroundColor: color.hex },
        ]}
      />
      <View style={styles.textContainer}>
        <Text style={styles.colorName}>{color.name}</Text>
        <Text style={styles.colorHex}>{color.hex}</Text>
        {color.reason ? (
          <Text style={styles.colorReason}>{color.reason}</Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
  colorBox: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textContainer: {
    flex: 1,
  },
  colorName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  colorHex: {
    fontSize: 13,
    color: '#999',
    fontFamily: 'Courier New',
  },
  colorReason: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
});

export default ColorCard;
