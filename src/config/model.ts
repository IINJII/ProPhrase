// import ollama from "ollama";
import { Ollama } from "ollama";
import { SYSTEM_PROMPT } from "../constants/prompt";

const ollama = new Ollama({
  host: process.env.OLLAMA_API_URL || "http://localhost:11434",
});

export const getOllamaChatResponse = (params: {
  tone: string;
  message: string;
}) => {
  const { tone, message } = params;
  const userPrompt = `rephrase the message in a ${tone} tone. message: ${message}`;

  return ollama.chat({
    model: "llama3.2:1b",
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
    keep_alive: -1,
    options: {
      temperature: 0.2,
    },
  });
};
