// Storage Service - LocalStorage with async API interface for future backend migration

import type { CalculationHistory, NPVResult } from './npv-types';

const STORAGE_KEY = 'npv_engine_calculations';

// Simulated async delay for realistic API behavior
const simulateDelay = (ms = 100) => new Promise(resolve => setTimeout(resolve, ms));

export interface StorageService {
  saveCalculation: (name: string, result: NPVResult) => Promise<CalculationHistory>;
  getCalculation: (id: string) => Promise<CalculationHistory | null>;
  getAllCalculations: () => Promise<CalculationHistory[]>;
  deleteCalculation: (id: string) => Promise<boolean>;
  updateCalculationName: (id: string, newName: string) => Promise<CalculationHistory | null>;
  clearAll: () => Promise<void>;
}

// Helper to safely parse stored data
function getStoredData(): CalculationHistory[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    // Convert date strings back to Date objects
    return parsed.map((item: CalculationHistory) => ({
      ...item,
      savedAt: new Date(item.savedAt),
      result: {
        ...item.result,
        calculatedAt: new Date(item.result.calculatedAt),
        strategyConfig: {
          ...item.result.strategyConfig,
          createdAt: new Date(item.result.strategyConfig.createdAt),
          updatedAt: new Date(item.result.strategyConfig.updatedAt),
        },
      },
    }));
  } catch {
    console.error('Failed to parse stored calculations');
    return [];
  }
}

// Helper to save data
function saveStoredData(data: CalculationHistory[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    console.error('Failed to save calculations to storage');
  }
}

// Generate unique ID
function generateId(): string {
  return `calc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// LocalStorage implementation
export const localStorageService: StorageService = {
  async saveCalculation(name: string, result: NPVResult): Promise<CalculationHistory> {
    await simulateDelay();
    
    const history: CalculationHistory = {
      id: generateId(),
      name,
      result,
      savedAt: new Date(),
    };
    
    const data = getStoredData();
    data.unshift(history); // Add to beginning
    saveStoredData(data);
    
    return history;
  },

  async getCalculation(id: string): Promise<CalculationHistory | null> {
    await simulateDelay();
    
    const data = getStoredData();
    return data.find(item => item.id === id) || null;
  },

  async getAllCalculations(): Promise<CalculationHistory[]> {
    await simulateDelay();
    return getStoredData();
  },

  async deleteCalculation(id: string): Promise<boolean> {
    await simulateDelay();
    
    const data = getStoredData();
    const index = data.findIndex(item => item.id === id);
    
    if (index === -1) return false;
    
    data.splice(index, 1);
    saveStoredData(data);
    
    return true;
  },

  async updateCalculationName(id: string, newName: string): Promise<CalculationHistory | null> {
    await simulateDelay();
    
    const data = getStoredData();
    const item = data.find(item => item.id === id);
    
    if (!item) return null;
    
    item.name = newName;
    saveStoredData(data);
    
    return item;
  },

  async clearAll(): Promise<void> {
    await simulateDelay();
    saveStoredData([]);
  },
};

// Export default storage service (can be swapped for backend service later)
export const storageService = localStorageService;
