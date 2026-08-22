export interface RegionalHub {
  id: string;
  name: string;
  moisture: string;
  crop: string;
  risk: 'High' | 'Medium' | 'Low';
  farmers: number;
  diseaseHeat: number;
}

export interface MacroMetrics {
  wheatYieldPredicted: string;
  ureaPriceCurrent: number;
  activeNodes: number;
  healthIndex: number;
}

export interface EdgeLog {
  id: number;
  time: string;
  message: string;
}

export const regionalHubs: RegionalHub[] = [
  { id: 'multan', name: 'Multan', moisture: '32%', crop: 'Wheat', risk: 'High', farmers: 4500, diseaseHeat: 85 },
  { id: 'faisalabad', name: 'Faisalabad', moisture: '45%', crop: 'Cotton', risk: 'Medium', farmers: 6200, diseaseHeat: 40 },
  { id: 'sukkur', name: 'Sukkur', moisture: '28%', crop: 'Sugarcane', risk: 'Low', farmers: 3100, diseaseHeat: 20 },
  { id: 'peshawar', name: 'Peshawar', moisture: '50%', crop: 'Maize', risk: 'Low', farmers: 2800, diseaseHeat: 15 },
];

export const macroMetrics: MacroMetrics = {
  wheatYieldPredicted: '+19%',
  ureaPriceCurrent: 4500, // PKR per bag
  activeNodes: 1420,
  healthIndex: 88.4,
};

export const initialEdgeLogs: EdgeLog[] = [
  { id: 1, time: '10:42:05', message: 'Multan Node #104: Leaf Rust Detected (94% confidence) - Immediate Reroute to Triazole Fungicide' },
  { id: 2, time: '10:41:22', message: 'Faisalabad Node #89: Soil moisture critical. Initiating localized irrigation alert.' },
  { id: 3, time: '10:39:10', message: 'Sukkur Node #210: Normal operations. Pest signature below threshold.' },
];
