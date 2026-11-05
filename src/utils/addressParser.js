/**
 * Extract Block / Wing and Flat Number hierarchically from customer flat address string
 */
export function extractBlockAndFlat(flatNo = '') {
  if (!flatNo) return { block: 'Main Wing', flat: 'N/A' };
  const raw = String(flatNo).trim();
  
  // Case: "Tower B - Flat 402" or "Block A - 101" or "Wing C / 203" or "B - 101"
  const dashSplit = raw.split(/[-–—/]/).map(s => s.trim()).filter(Boolean);
  if (dashSplit.length >= 2) {
    let blockPart = dashSplit[0];
    let flatPart = dashSplit.slice(1).join(' - ');
    if (!/block|tower|wing/i.test(blockPart)) {
      blockPart = `Block ${blockPart}`;
    }
    return { block: blockPart, flat: flatPart };
  }
  
  // Case: "Tower A 101" or "Block B 202" or "Wing C 303"
  const prefixMatch = raw.match(/^(tower\s+[a-z0-9]+|block\s+[a-z0-9]+|wing\s+[a-z0-9]+)\s*(.*)$/i);
  if (prefixMatch) {
    return { block: prefixMatch[1], flat: prefixMatch[2] || prefixMatch[1] };
  }
  
  // Case: "A101" or "B204" (Letter followed by digits)
  const letterNumMatch = raw.match(/^([A-Za-z])[- ]*(\d+)$/);
  if (letterNumMatch) {
    return { block: `Block ${letterNumMatch[1].toUpperCase()}`, flat: letterNumMatch[2] };
  }

  // Single letter like "B"
  if (/^[A-Za-z]$/.test(raw)) {
    return { block: `Block ${raw.toUpperCase()}`, flat: `Flat ${raw.toUpperCase()}` };
  }

  return { block: 'Main Wing', flat: raw };
}

