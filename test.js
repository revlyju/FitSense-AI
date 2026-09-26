function normalizeColorList(list) {
  if (!Array.isArray(list)) return [];

  return list
    .map((item) => {
      if (!item) return null;

      if (typeof item === 'string') {
        const hexMatch = item.match(/#[0-9a-fA-F]{3,8}\b/i) || item.match(/#[0-9a-fA-F]{3,8}/i);
        const hex = hexMatch ? hexMatch[0] : undefined;
        let nameText = hexMatch ? item.replace(hexMatch[0], '').trim() : item.trim();
        nameText = nameText.replace(/\(\s*\)/g, '').trim() || hex || item;

        return {
          name: nameText,
          hex: hex || (item.startsWith('#') ? item : '#cccccc'),
          reason: '',
        };
      }

      if (typeof item === 'object') {
        const rawHex = item.hex || item.color || item.value || '';
        const hexMatch = typeof rawHex === 'string' ? (rawHex.match(/#[0-9a-fA-F]{3,8}\b/i) || rawHex.match(/#[0-9a-fA-F]{3,8}/i)) : null;
        const hex = hexMatch ? hexMatch[0] : (typeof rawHex === 'string' && rawHex.startsWith('#') ? rawHex : '#cccccc');

        let nameText = item.name || item.label || item.color || hex || 'Color';
        if (typeof nameText === 'string' && hex) {
          nameText = nameText.replace(hex, '').replace(/\(\s*\)/g, '').trim() || nameText;
        }

        return {
          name: nameText,
          hex: hex,
          reason: item.reason || '',
        };
      }

      return null;
    })
    .filter(Boolean);
}

const input = [
  { name: "Navy Blue", hex: "1C2841" },
  { name: "Black", hex: "000000" },
  { name: "White", hex: "#FFFFFF" }
];
console.log(normalizeColorList(input));
