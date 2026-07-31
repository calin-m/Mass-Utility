// @Arch[useTableDensity]
import { useState, useEffect } from 'react';

export type TableDensity = 'compact' | 'comfortable';

const DENSITY_STORAGE_KEY = 'pm_table_density';

export function useTableDensity(defaultDensity: TableDensity = 'comfortable'): [TableDensity, (newDensity: TableDensity) => void] {
  const [density, setDensityState] = useState<TableDensity>(() => {
    try {
      const saved = localStorage.getItem(DENSITY_STORAGE_KEY);
      if (saved === 'compact' || saved === 'comfortable') {
        return saved;
      }
    } catch (e) {
      // Graceful fallback if localStorage is blocked or restricted
    }
    return defaultDensity;
  });

  const setDensity = (newDensity: TableDensity) => {
    setDensityState(newDensity);
    try {
      localStorage.setItem(DENSITY_STORAGE_KEY, newDensity);
      // Dispatch custom storage event for instant intra-page component synchronization
      window.dispatchEvent(new Event('pm_density_changed'));
    } catch (e) {
      // Graceful fallback
    }
  };

  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem(DENSITY_STORAGE_KEY);
        if (saved === 'compact' || saved === 'comfortable') {
          setDensityState(saved);
        }
      } catch (e) {
        // Graceful fallback
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('pm_density_changed', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('pm_density_changed', handleStorageChange);
    };
  }, []);

  return [density, setDensity];
}
