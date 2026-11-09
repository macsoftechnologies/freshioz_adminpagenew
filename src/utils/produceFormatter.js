/**
 * Produces standardized, human-friendly unit & quantity formatting
 * Handles pieces, gram packs, kilogram crates, and fractional quantities.
 */
export function formatProduceQuantity(qty, unitStr) {
  const q = Number(qty) || 1;
  const rawUnit = String(unitStr || 'kg').trim();
  const lowerUnit = rawUnit.toLowerCase();

  // 1. Piece / Count based units (e.g. "1 pc", "pc", "pcs", "piece", "pieces", "1 nos", "nos")
  if (/\b(?:pc|pcs|piece|pieces|nos|item|items)\b/i.test(lowerUnit)) {
    const matchCount = rawUnit.match(/^(\d+(?:\.\d+)?)\s*(?:pc|pcs|piece|pieces|nos)?$/i);
    const multiplier = matchCount ? parseFloat(matchCount[1]) : 1;
    const totalPcs = Math.round(q * multiplier);
    const unitLabel = totalPcs === 1 ? 'pc' : 'pcs';

    return {
      totalCount: totalPcs,
      displayUnit: unitLabel,
      step: 1,
      isDiscrete: true,
      badge: `${totalPcs} ${unitLabel}`,
      detailedLabel: multiplier > 1 ? `${q} × ${multiplier} pc (${totalPcs} pcs)` : `${totalPcs} ${unitLabel}`,
      formatQty: (val) => `${Math.round(val)} ${Math.round(val) === 1 ? 'pc' : 'pcs'}`
    };
  }

  // 2. Gram packs (e.g. "500 g", "500g", "250 g", "100 g", "500 gm")
  const gramMatch = rawUnit.match(/^(\d+(?:\.\d+)?)\s*g(?:m|ram|rams)?$/i);
  if (gramMatch) {
    const packGrams = parseFloat(gramMatch[1]);
    const totalGrams = q * packGrams;
    const totalKg = totalGrams / 1000;
    const kgFormatted = totalKg >= 1 ? `${totalKg % 1 === 0 ? totalKg.toFixed(0) : totalKg.toFixed(2)} kg` : `${totalGrams} g`;

    return {
      totalCount: q,
      packGrams,
      totalGrams,
      totalKg,
      displayUnit: q === 1 ? 'pack' : 'packs',
      step: 1,
      isDiscrete: true,
      badge: `${q} × ${packGrams}g (${kgFormatted})`,
      detailedLabel: `${q} pack${q > 1 ? 's' : ''} (${kgFormatted})`,
      formatQty: (val) => {
        const g = val * packGrams;
        const kg = g / 1000;
        return `${val} pack${val === 1 ? '' : 's'} (${kg >= 1 ? `${kg.toFixed(1)} kg` : `${g} g`})`;
      }
    };
  }

  // 3. Kilogram packs (e.g. "1 kg", "2 kg", "0.5 kg", "kg")
  const kgMatch = rawUnit.match(/^(\d+(?:\.\d+)?)\s*kg$/i);
  if (kgMatch) {
    const packKg = parseFloat(kgMatch[1]);
    const totalKg = q * packKg;
    const kgFormatted = `${totalKg % 1 === 0 ? totalKg.toFixed(0) : totalKg.toFixed(2)} kg`;

    return {
      totalCount: totalKg,
      displayUnit: 'kg',
      step: 0.5,
      isDiscrete: false,
      badge: packKg !== 1 ? `${q} × ${packKg}kg (${kgFormatted})` : `${kgFormatted}`,
      detailedLabel: kgFormatted,
      formatQty: (val) => `${Number(val).toFixed(1)} kg`
    };
  }

  // 4. Default generic fallback
  return {
    totalCount: q,
    displayUnit: rawUnit,
    step: 1,
    isDiscrete: true,
    badge: `${q} ${rawUnit}`,
    detailedLabel: `${q} ${rawUnit}`,
    formatQty: (val) => `${val} ${rawUnit}`
  };
}

