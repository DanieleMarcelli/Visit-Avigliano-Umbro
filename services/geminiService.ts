diff --git a/services/geminiService.ts b/services/geminiService.ts
index 17e317f02e3cf54789f6dc8c5c0cb7a3c2f30677..dc3719a1b25910cefa3b2306834411efe51eb07a 100644
--- a/services/geminiService.ts
+++ b/services/geminiService.ts
@@ -23,78 +23,81 @@ If asked about something not in the list, politely suggest checking the official
 
 export const sendMessageToGemini = async (message: string): Promise<string> => {
   if (!process.env.API_KEY) {
     return "API Key is missing. Please configure the environment.";
   }
 
   try {
     const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
 
-export const analyzeEventPoster = async (base64Image: string): Promise<Partial<EventItem>> => {
+export const analyzeEventPoster = async (
+    base64Image: string,
+    mimeType: string = 'image/png'
+): Promise<Partial<EventItem>> => {
     if (!process.env.API_KEY) {
         throw new Error("API Key missing");
     }
 
     const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
     
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
-                    { inlineData: { mimeType: 'image/png', data: base64Image } },
+                    { inlineData: { mimeType, data: base64Image } },
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
