import { GoogleGenAI } from "@google/genai";
import { EventItem } from '../types';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (GEMINI_API_KEY) {
  console.info("Gemini API key detected. AI features are enabled.");
} else {
  console.warn("Gemini API key is missing. AI-powered features will be disabled until a key is configured.");
}

// We pass the current events dynamically now, but keep the constant as a fallback/initial state source
let CURRENT_EVENTS_CONTEXT: any[] = [];

export const updateGeminiContext = (events: EventItem[]) => {
  CURRENT_EVENTS_CONTEXT = events.map(e => ({
    title: e.title,
    date: e.date,
    desc: e.description,
    loc: e.location
  }));
};

const SYSTEM_INSTRUCTION_CHAT = `
You are the "Visit Avigliano Umbro" AI concierge. You are helpful, polite, and knowledgeable about the events in Avigliano Umbro.
Your goal is to help visitors find events they might like based on the provided event data.
Keep your answers concise (under 100 words unless asked for detail).
Always be inviting and enthusiastic about the local culture.
If asked about something not in the list, politely suggest checking the official contacts.
`;

export const sendMessageToGemini = async (message: string): Promise<string> => {
  if (!GEMINI_API_KEY) {
    return "API Key is missing. Please configure the environment.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const contextString = `Current Events Data: ${JSON.stringify(CURRENT_EVENTS_CONTEXT)}`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `${contextString}\nUser Query: ${message}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_CHAT,
      }
    });

    return response.text || "Mi dispiace, non ho capito. Riprova più tardi.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Si è verificato un errore temporaneo. Riprova tra poco.";
  }
};

export const analyzeEventPoster = async (base64Image: string): Promise<Partial<EventItem>> => {
    if (!GEMINI_API_KEY) {
        throw new Error("API Key missing");
    }

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    
    const prompt = `
    Analyze this event poster (locandina) for Visit Avigliano Umbro.
    Extract the following information and return it in JSON format only:
    - title: The main title of the event.
    - subtitle: Any secondary title or artist name.
    - description: A short summary of the event (max 2 sentences).
    - date: The date of the event in YYYY-MM-DD format. If year is missing, assume next occurrence.
    - time: The time (e.g., "21:00").
    - location: The venue name.
    - category: Choose one best fit from: ["Musica", "Teatro", "Mostra", "Sagra", "Musica Classica", "Tutte le categorie"].
    - tags: An array of 2-3 short keywords.

    Return ONLY the JSON object.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/png', data: base64Image } },
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: "application/json"
            }
        });

        const text = response.text;
        if (!text) throw new Error("No response from AI");
        
        const data = JSON.parse(text);
        
        // Convert date string to Date object if present
        if (data.date) {
            data.date = new Date(data.date);
        } else {
            data.date = new Date();
        }

        return data;

    } catch (error) {
        console.error("Error analyzing poster:", error);
        throw error;
    }
}