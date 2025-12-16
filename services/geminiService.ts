import { GoogleGenAI, Type } from "@google/genai";
import { MODEL_NAME } from "../constants";
import { Difficulty, QuizQuestion, WordData } from "../types";

let genAI: GoogleGenAI | null = null;

export const setApiKey = (key: string) => {
  if (!key) {
    genAI = null;
    return;
  }
  genAI = new GoogleGenAI({ apiKey: key });
};

export const hasApiKey = (): boolean => {
  return !!genAI;
};

// Schema for a single word data object
const wordSchema = {
  type: Type.OBJECT,
  properties: {
    word: { type: Type.STRING },
    definition: { type: Type.STRING },
    example: { type: Type.STRING },
    pronunciation: { type: Type.STRING },
    partOfSpeech: { type: Type.STRING },
  },
  required: ["word", "definition", "example", "partOfSpeech"],
};

// Schema for a quiz question
const quizSchema = {
  type: Type.OBJECT,
  properties: {
    question: { type: Type.STRING },
    options: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    correctAnswer: { type: Type.STRING },
    wordContext: wordSchema,
  },
  required: ["question", "options", "correctAnswer", "wordContext"],
};

// Helper to ensure variety by injecting random constraints into the prompt
const getVarietyConstraint = () => {
  const topics = [
    "science", "literature", "philosophy", "history", "art", 
    "architecture", "nature", "astronomy", "psychology", 
    "business", "culinary arts", "technology", "emotion", "movement"
  ];
  
  const strategies = [
    // Strategy 1: Start with a random letter
    () => {
      const chars = "abcdefghijklmnoprstuvw"; // Excluding some harder ones like x/z/q for better hit rate
      const char = chars.charAt(Math.floor(Math.random() * chars.length)).toUpperCase();
      return `start with the letter '${char}'`;
    },
    // Strategy 2: Relate to a random topic
    () => {
      const topic = topics[Math.floor(Math.random() * topics.length)];
      return `be related to the field or concept of ${topic}`;
    },
    // Strategy 3: Specific semantic nuances
    () => {
      const nuances = ["an abstract concept", "a physical action", "a descriptive adjective for personality", "a formal noun"];
      return `be ${nuances[Math.floor(Math.random() * nuances.length)]}`;
    }
  ];

  // Pick a random strategy
  return strategies[Math.floor(Math.random() * strategies.length)]();
};

const ensureClient = () => {
  if (!genAI) {
    throw new Error("API_KEY_MISSING");
  }
  return genAI;
};

export const generateWordOfDay = async (difficulty: Difficulty): Promise<WordData> => {
  try {
    const client = ensureClient();
    const constraint = getVarietyConstraint();
    const prompt = `Generate a sophisticated or interesting vocabulary word suitable for a ${difficulty} level student. 
    The word must ${constraint}.
    Provide the word, definition, an example sentence, its part of speech, and a simple pronunciation guide.
    IMPORTANT: Do not use common words like "ubiquitous", "serendipity", "ephemeral", "eloquent", or "resilient".`;
    
    const response = await client.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: wordSchema,
        temperature: 1.0, // Increased temperature for more variety
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text) as WordData;
  } catch (error) {
    console.error("Error generating word of the day:", error);
    throw error;
  }
};

export const generateDefinitionQuiz = async (difficulty: Difficulty): Promise<QuizQuestion> => {
  try {
    const client = ensureClient();
    const constraint = getVarietyConstraint();
    const prompt = `Create a multiple-choice vocabulary quiz question for a ${difficulty} level student. 
    The target word for the question must ${constraint}.
    The question should ask for the definition of this specific word.
    Include 4 options, one correct and three distractors.
    Also return the full data for the target word (word, definition, example, etc.).
    IMPORTANT: Do not use common words like "ubiquitous", "serendipity", "ephemeral".`;

    const response = await client.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: quizSchema,
        temperature: 1.0,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text) as QuizQuestion;
  } catch (error) {
    console.error("Error generating quiz:", error);
    throw error;
  }
};

export const generateContextQuiz = async (difficulty: Difficulty): Promise<QuizQuestion> => {
  try {
    const client = ensureClient();
    const constraint = getVarietyConstraint();
    const prompt = `Create a "fill-in-the-blank" vocabulary quiz question for a ${difficulty} level student.
    The target word must ${constraint}.
    The question should be a sentence with the target word missing (represented by blank).
    Include 4 options (words) that could fit, only one is correct.
    Also return the full data for the target word.
    IMPORTANT: Do not use common words like "ubiquitous", "serendipity", "ephemeral".`;

    const response = await client.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: quizSchema,
        temperature: 1.0,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text) as QuizQuestion;
  } catch (error) {
    console.error("Error generating context quiz:", error);
    throw error;
  }
};
