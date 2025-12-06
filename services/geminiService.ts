import { GoogleGenAI, Type } from "@google/genai";
import { Grid } from '../types';

export const parseGridFromImage = async (
  imageSrc: string,
  apiKey: string
): Promise<Grid> => {
  if (!apiKey) throw new Error("API Key is missing");
  const ai = new GoogleGenAI({ apiKey });
  const base64Data = imageSrc.split(',')[1];
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png', 
              data: base64Data,
            },
          },
          {
            text: `Extract the grid of numbers from this image.
            
            This is a pixel-art game. The grid contains numbers from 1 to 9.
            
            CRITICAL OPTICAL RECOGNITION RULES FOR PIXEL ART:
            1. **5 vs 6**: 
               - '5' has a flat top bar and an open bottom-left. 
               - '6' has a closed loop at the bottom and mass concentrated at the bottom.
            2. **8 vs 6/9**: 
               - '8' has TWO loops (top and bottom). If you see two holes, it is an 8.
               - '6' has one bottom loop.
               - '9' has one top loop.
            3. **1 vs 7**: '1' is a straight vertical line. '7' has a distinct top bar.
            
            STRUCTURE:
            - Analyze the image row by row.
            - Ensure every row has the same number of columns (pad with 0 if necessary).
            - Return ONLY the raw JSON 2D array.
            
            Use your Thinking Process to map the pixel topology before answering.`
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.INTEGER,
            },
          },
        },
        thinkingConfig: {
          thinkingBudget: 4096, 
        },
      },
    });
    
    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    const grid = JSON.parse(text) as Grid;
    
    if (grid.length > 0) {
      const maxCols = Math.max(...grid.map(row => row.length));
      const normalizedGrid = grid.map(row => {
        const newRow = [...row];
        while (newRow.length < maxCols) {
          newRow.push(0);
        }
        return newRow;
      });
      return normalizedGrid;
    }
    return grid;
  } catch (error) {
    throw error;
  }
};