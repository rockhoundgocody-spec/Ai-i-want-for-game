
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { RockAnalysis, RockType, DailyBounty, Rock } from '../types';
import { api } from './api';

// Create client on demand to ensure we always use the latest API key from the environment
const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const CLOVER_CORE_PERSONA = `
You are "Clover," an elite AI Field Guide with a Ph.D. in Mineralogy and advanced spectroscopy capability.
Tone: Authoritative, precise, yet encouraging for field operatives.
Core Mandate: Analyze geological specimens with "Mineralogy 4.0" precision.
Focus on: Crystal Systems, Cleavage, Luster, Specific Gravity estimation, and distinguishing polymorphs.
`;

export const createGeminiChat = () => {
    return getAiClient().chats.create({
        model: 'gemini-3-pro-preview',
        config: { systemInstruction: CLOVER_CORE_PERSONA }
    });
};

export const generateHighResImage = async (prompt: string, size: '1K' | '2K' | '4K' = '1K') => {
    await api.logAiRequest('gemini-3-pro-image-preview', 'IMAGE_GEN');
    const response = await getAiClient().models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: [{ parts: [{ text: `A photorealistic museum specimen of: ${prompt}. Macro lens, 8k resolution, geological textbook quality.` }] }],
        config: {
            imageConfig: { aspectRatio: "1:1", imageSize: size }
        },
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("No image data returned");
};

export const generateReferenceImage = generateHighResImage;

export const editSpecimenImage = async (base64Image: string, prompt: string) => {
    await api.logAiRequest('gemini-2.5-flash-image', 'IMAGE_EDIT');
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpg|jpeg|webp);base64,/, '');
    const response = await getAiClient().models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { data: cleanBase64, mimeType: 'image/jpeg' } },
                { text: `Edit this geological specimen: ${prompt}. Keep lighting and perspective consistent.` }
            ]
        }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("Editing failed");
};

export const generateVeoVideo = async (prompt: string, startImageBase64?: string, aspectRatio: '16:9' | '9:16' = '16:9') => {
    await api.logAiRequest('veo-3.1-fast-generate-preview', 'VIDEO_GEN');
    const ai = getAiClient();
    const config: any = {
        model: 'veo-3.1-fast-generate-preview',
        prompt: `Cinematic geological documentary shot: ${prompt}`,
        config: { numberOfVideos: 1, resolution: '720p', aspectRatio }
    };
    if (startImageBase64) {
        config.image = {
            imageBytes: startImageBase64.replace(/^data:image\/(png|jpg|jpeg|webp);base64,/, ''),
            mimeType: 'image/jpeg'
        };
    }

    let operation = await ai.models.generateVideos(config);
    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation });
    }
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
};

export const identifyRock = async (base64Image: string): Promise<RockAnalysis> => {
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpg|jpeg|webp);base64,/, '');
    await api.logAiRequest('gemini-3-flash-preview', 'IDENTIFY');
    
    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING },
            scientificName: { type: Type.STRING },
            type: { type: Type.STRING, enum: Object.values(RockType) },
            description: { type: Type.STRING },
            rarityScore: { type: Type.INTEGER },
            hardness: { type: Type.NUMBER },
            color: { type: Type.ARRAY, items: { type: Type.STRING } },
            composition: { type: Type.ARRAY, items: { type: Type.STRING } },
            funFact: { type: Type.STRING },
            isGeologicalSpecimen: { type: Type.BOOLEAN },
            expertExplanation: { type: Type.STRING },
            bonusXP: {
                type: Type.OBJECT,
                properties: {
                    rarity: { type: Type.INTEGER },
                    expertEye: { type: Type.INTEGER }
                },
                required: ['rarity', 'expertEye']
            },
            estimatedValue: { type: Type.INTEGER },
            petrology: { type: Type.STRING, description: "Detailed petrological classification (e.g. felsic intrusive igneous)" },
            formationGenesis: { type: Type.STRING, description: "Geological history of formation" }
        },
        required: ['name', 'scientificName', 'type', 'description', 'rarityScore', 'hardness', 'color', 'composition', 'funFact', 'isGeologicalSpecimen', 'expertExplanation', 'bonusXP', 'estimatedValue', 'petrology', 'formationGenesis']
    };

    const response = await getAiClient().models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [
            { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
            // Enhanced prompt to account for environmental factors
            { text: "Analyze this geological specimen as Clover, an expert mineralogist. Focus solely on the specimen, ignoring background clutter. Account for variable lighting conditions and image quality, extracting core geological features. Provide expert mineralogy data including crystal system, cleavage, and petrology. If not a rock, return isGeologicalSpecimen: false. Respond strictly in JSON format." }
        ]}],
        config: { 
            responseMimeType: "application/json",
            responseSchema
        }
    });
    return JSON.parse(response.text || '{}') as RockAnalysis;
};

// Cache bounty to prevent 429 errors from location jitter
let cachedBountyData: { timestamp: number, data: DailyBounty, lat?: number, lng?: number } | null = null;

// Modified getDailyBounty with caching and robust error handling
export const getDailyBounty = async (lat?: number, lng?: number) => {
    // Default location (e.g., central United States, or a generally interesting spot)
    const defaultLat = 39.8283; 
    const defaultLng = -98.5795; 

    const effectiveLat = lat ?? defaultLat;
    const effectiveLng = lng ?? defaultLng;

    // Cache Logic: Use cached data if < 60 mins old and location < 2km difference (approx 0.02 deg)
    if (cachedBountyData) {
        const isFresh = (Date.now() - cachedBountyData.timestamp) < (1000 * 60 * 60);
        let isClose = true;
        if (lat && lng && cachedBountyData.lat && cachedBountyData.lng) {
            const dist = Math.sqrt(Math.pow(cachedBountyData.lat - lat, 2) + Math.pow(cachedBountyData.lng - lng, 2));
            isClose = dist < 0.02;
        }
        if (isFresh && isClose) {
            return cachedBountyData.data;
        }
    }

    const prompt = `GPS: ${effectiveLat}, ${effectiveLng}. Scout surrounding geology (USGS/Macrostrat context) and propose a daily bounty. JSON only.`;
    
    // Fallback bounty in case of API failure
    const fallbackBounty: DailyBounty = {
        targetMineral: 'Quartz Geode',
        xpMultiplier: 1.2,
        locationName: 'Global Sector Command',
        geologicalReason: 'Stable silicate formations observed universally.'
    };

    try {
        const response = await getAiClient().models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        const parsedResponse = JSON.parse(response.text || '{}');
        // Simple validation to ensure the response is somewhat complete
        if (parsedResponse.targetMineral && parsedResponse.locationName) {
            cachedBountyData = {
                timestamp: Date.now(),
                data: parsedResponse,
                lat: effectiveLat,
                lng: effectiveLng
            };
            return parsedResponse;
        } else {
            console.warn("Gemini bounty response was incomplete. Using fallback.");
            return fallbackBounty;
        }
    } catch (error: any) {
        // Handle Quota Limits gracefully
        if (error.status === 429 || error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED')) {
             console.warn("Gemini API Quota Exceeded (Daily Bounty). Deploying fallback protocol.");
             return fallbackBounty;
        }
        console.error("Failed to fetch daily bounty from Gemini API, using fallback:", error);
        return fallbackBounty;
    }
};

export const refineSpecimen = async (rock: Rock) => {
    await api.logAiRequest('gemini-3-flash-preview', 'REFINE');
    const response = await getAiClient().models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Refine analysis for: ${rock.name} (Type: ${rock.type}). Provide deep geological lore, advanced petrology, and molecular structure description. JSON only.`,
        config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || '{}');
};

export const fuseSpecimens = async (rockA: Rock, rockB: Rock) => {
    await api.logAiRequest('gemini-3-flash-preview', 'FUSION');
    const response = await getAiClient().models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Hypothetical Geological Fusion: Fuse ${rockA.name} and ${rockB.name}. Create a plausible hybrid mineral with scientific backing. Return detailed JSON.`,
        config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || '{}');
};

export const getCloverLiveConfig = () => {
    return {
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
            },
            systemInstruction: CLOVER_CORE_PERSONA,
        }
    };
};
