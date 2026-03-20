
import { WeatherData, WeatherHourly } from '../types';

// -- PROCEDURAL GENERATION ENGINE --

const generateDiurnalCycle = (hour: number, baseTemp: number, amplitude: number) => {
    // Peak heat at 15:00 (3 PM), lowest at 04:00 (4 AM)
    const timeOffset = (hour - 15) / 24 * Math.PI * 2;
    return baseTemp + Math.cos(timeOffset) * amplitude;
};

const generateForecast = (days: number): WeatherHourly => {
    const hoursTotal = days * 24;
    const times: string[] = [];
    const temps: number[] = [];
    const clouds: number[] = [];
    const precip: number[] = [];
    const winds: number[] = [];
    
    // Historical buffers
    const prev1: number[] = [];
    const prev2: number[] = [];
    const prev3: number[] = [];
    const prev4: number[] = [];
    const prev5: number[] = [];

    const now = new Date();
    
    // Seed random starting conditions
    let currentCloudTrend = Math.random() * 100;
    let currentWindTrend = 10 + Math.random() * 10;
    
    for (let i = 0; i < hoursTotal; i++) {
        const d = new Date(now);
        d.setHours(d.getHours() + i);
        times.push(d.toISOString().slice(0, 16));

        // 1. Temperature Simulation
        const baseTemp = generateDiurnalCycle(d.getHours(), 55, 15);
        const frontNoise = Math.sin(i / 50) * 10; 
        const microNoise = (Math.random() - 0.5) * 2;
        temps.push(Math.round(baseTemp + frontNoise + microNoise));

        // 2. Cloud Cover Simulation (Brownian Motion)
        const drift = (Math.random() - 0.5) * 20;
        currentCloudTrend = Math.max(0, Math.min(100, currentCloudTrend + drift));
        const dHour = d.getHours();
        const afternoonBoost = (dHour > 12 && dHour < 18) ? 10 : 0;
        const finalClouds = Math.round(Math.min(100, currentCloudTrend + afternoonBoost));
        clouds.push(finalClouds);

        // 3. Precipitation (Correlated with clouds)
        const rainChance = finalClouds > 80 ? (finalClouds - 80) * 2 : 0;
        precip.push(Math.random() * 100 < rainChance ? Math.round(Math.random() * 5) : 0);

        // 4. Wind Speed
        const windDrift = (Math.random() - 0.5) * 5;
        currentWindTrend = Math.max(2, Math.min(45, currentWindTrend + windDrift));
        winds.push(Math.round(currentWindTrend));

        // Historical
        prev1.push(Math.round(baseTemp + frontNoise + (Math.random() - 0.5) * 5 - 2));
        prev2.push(Math.round(baseTemp + frontNoise + (Math.random() - 0.5) * 5 + 3));
        prev3.push(Math.round(baseTemp + frontNoise + (Math.random() - 0.5) * 5));
        prev4.push(Math.round(baseTemp + frontNoise + (Math.random() - 0.5) * 5));
        prev5.push(Math.round(baseTemp + frontNoise + (Math.random() - 0.5) * 5));
    }

    return {
        time: times,
        temperature_2m: temps,
        temperature_2m_previous_day1: prev1,
        temperature_2m_previous_day2: prev2,
        temperature_2m_previous_day3: prev3,
        temperature_2m_previous_day4: prev4,
        temperature_2m_previous_day5: prev5,
        cloudcover: clouds,
        precipitation: precip,
        windspeed_10m: winds
    };
};

let cachedForecast: WeatherData | null = null;

export const getWeatherData = async (): Promise<WeatherData> => {
  await new Promise(resolve => setTimeout(resolve, 800));

  if (cachedForecast && new Date().getMinutes() !== 0) {
      return cachedForecast;
  }

  const generated = generateForecast(7);

  cachedForecast = {
    latitude: 52.52,
    longitude: 13.41,
    generationtime_ms: 0.85,
    utc_offset_seconds: 3600,
    timezone: "CET",
    timezone_abbreviation: "CET",
    elevation: 38,
    hourly_units: {
      time: "iso8601",
      temperature_2m: "°F",
      temperature_2m_previous_day1: "°F",
      temperature_2m_previous_day2: "°F",
      temperature_2m_previous_day3: "°F",
      temperature_2m_previous_day4: "°F",
      temperature_2m_previous_day5: "°F",
      cloudcover: "%",
      precipitation: "mm",
      windspeed_10m: "km/h"
    },
    hourly: generated
  };

  return cachedForecast;
};
