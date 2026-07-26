// Centralized License Key Utilities & Formatting Helpers

/**
 * Enhanced Security Masking: Shows only 'MASS-' prefix followed by masked bullet stream
 * Example: 'MASS-PRO-8F2A9C1B4E7D0F3A-2026' -> 'MASS-••••••••••••••••••••••••••••'
 */
export const maskLicenseKey = (key: string): string => {
  if (!key) return '';
  const trimmed = key.trim();
  if (trimmed.toUpperCase().startsWith('MASS-')) {
    return 'MASS-••••••••••••••••••••••••••••';
  }
  if (trimmed.length > 5) {
    return trimmed.substring(0, 5) + '••••••••••••••••••••••••';
  }
  return 'MASS-••••••••••••••••••••••••••••';
};

export const copyLicenseKeyToClipboard = async (key: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(key);
    return true;
  } catch {
    return false;
  }
};
