
import React from 'react';

export enum RockType {
  IGNEOUS = 'Igneous',
  SEDIMENTARY = 'Sedimentary',
  METAMORPHIC = 'Metamorphic',
  MINERAL = 'Mineral',
  FOSSIL = 'Fossil',
  UNKNOWN = 'Unknown',
  SYNTHETIC = 'Synthetic'
}

export enum View {
  HOME = 'HOME',
  SCANNER = 'SCANNER',
  COLLECTION = 'COLLECTION',
  DETAILS = 'DETAILS',
  PROFILE = 'PROFILE',
  MAP = 'MAP',
  ACHIEVEMENTS = 'ACHIEVEMENTS',
  FUSION = 'FUSION',
  ADMIN = 'ADMIN',
  COMPARISON = 'COMPARISON'
}

export interface OperatorStats {
  totalScans: number;
  distanceTraveled: number;
  uniqueSpeciesFound: number;
  legendaryFinds: number;
  highestRarityFound: number;
  scanStreak: number;
}

export interface Badge {
  id: string;
  dateUnlocked: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  xp: number;
  level: number;
  rankTitle?: string;
  avatarUrl?: string;
  credits?: number;
  operatorStats?: OperatorStats;
  createdAt?: string;
  isAdmin?: boolean;
  roles?: string[];
  mfaEnabled?: boolean;
}

export interface Rock {
  id: string;
  userId: string;
  name: string;
  type: RockType;
  scientificName: string;
  description: string;
  rarityScore: number;
  hardness: number;
  color: string[];
  composition: string[];
  funFact: string;
  imageUrl: string;
  comparisonImageUrl?: string;
  location?: { lat: number; lng: number };
  spectralWaveform: number[];
  refinementLevel: number;
  expertExplanation?: string;
  bonusXP: { rarity: number; expertEye: number };
  isGeologicalSpecimen: boolean;
  estimatedValue: number;
  marketInsight?: string;
  geologicalLore?: string;
  molecularStructure?: string;
  dateFound: number;
  status?: string;
  petrology?: string;
  formationGenesis?: string;
  fusionData?: any;
}

export interface RockAnalysis {
  name: string;
  scientificName: string;
  type: RockType;
  description: string;
  rarityScore: number;
  hardness: number;
  color: string[];
  composition: string[];
  funFact: string;
  isGeologicalSpecimen: boolean;
  expertExplanation?: string;
  bonusXP: { rarity: number; expertEye: number };
  estimatedValue: number;
  marketInsight?: string;
  petrology?: string;
  formationGenesis?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: any;
  xpReward: number;
  goal: number;
  progress: (user: User, rocks: Rock[]) => number;
}

export interface DailyBounty {
  targetMineral: string;
  xpMultiplier: number;
  locationName: string;
  geologicalReason: string;
}

export interface GeologicalZone {
  id: string;
  type: 'METAMORPHIC' | 'ALLUVIAL';
  name: string;
  coordinates: [number, number];
  radius: number;
  access: 'PUBLIC' | 'PRIVATE';
  description: string;
  likelyMinerals: string[];
}

export interface WeatherHourly {
  time: string[];
  temperature_2m: number[];
  temperature_2m_previous_day1: number[];
  temperature_2m_previous_day2: number[];
  temperature_2m_previous_day3: number[];
  temperature_2m_previous_day4: number[];
  temperature_2m_previous_day5: number[];
  cloudcover: number[];
  precipitation: number[];
  windspeed_10m: number[];
}

export interface WeatherData {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  hourly_units: {
    time: string;
    temperature_2m: string;
    temperature_2m_previous_day1: string;
    temperature_2m_previous_day2: string;
    temperature_2m_previous_day3: string;
    temperature_2m_previous_day4: string;
    temperature_2m_previous_day5: string;
    cloudcover: string;
    precipitation: string;
    windspeed_10m: string;
  };
  hourly: WeatherHourly;
}

export interface AuditLog {
    id: string;
    action: string;
    severity: 'INFO' | 'WARN' | 'CRITICAL';
    timestamp: string;
    details: any;
    ip?: string;
    user?: string;
}
