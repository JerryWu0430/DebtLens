import { GoogleGenAI, Type } from "@google/genai";

const MAX_FILE_CHARS = 4000;
const MAX_CONTEXT_TOKENS = 30000;
const CHARS_PER_TOKEN = 4; // rough estimate
const MAX_CONTEXT_CHARS = MAX_CONTEXT_TOKENS * CHARS_PER_TOKEN;

// Structured output types
export type Blocker = {
  file: string;
  line?: number;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
};

export type Dependency = {
  from: string;
  to: string;
  type: "import" | "call" | "extends" | "implements";
};

export type Action = {
  type: "refactor" | "fix" | "test" | "document" | "review";
  file: string;
  description: string;
  priority: number;
};

export type AnalysisResult = {
  blockers: Blocker[];
  dependencies: Dependency[];
  actions: Action[];
  summary: string;
};

// Schema for structured output
const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    blockers: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          file: { type: Type.STRING },
          line: { type: Type.NUMBER },
          description: { type: Type.STRING },
          severity: { type: Type.STRING, enum: ["low", "medium", "high", "critical"] },
        },
        required: ["file", "description", "severity"],
      },
    },
    dependencies: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          from: { type: Type.STRING },
          to: { type: Type.STRING },
          type: { type: Type.STRING, enum: ["import", "call", "extends", "implements"] },
        },
        required: ["from", "to", "type"],
      },
    },
    actions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: ["refactor", "fix", "test", "document", "review"] },
          file: { type: Type.STRING },
          description: { type: Type.STRING },
          priority: { type: Type.NUMBER },
        },
        required: ["type", "file", "description", "priority"],
      },
    },
    summary: { type: Type.STRING },
  },
  required: ["blockers", "dependencies", "actions", "summary"],
};

export function truncateFile(content: string, maxChars = MAX_FILE_CHARS): string {
  if (content.length <= maxChars) return content;
  const truncated = content.slice(0, maxChars);
  const lastNewline = truncated.lastIndexOf("\n");
  return (lastNewline > maxChars * 0.8 ? truncated.slice(0, lastNewline) : truncated) +
    `\n\n... [truncated ${content.length - maxChars} chars]`;
}

export function truncateContext(
  files: { path: string; content: string }[],
  maxChars = MAX_CONTEXT_CHARS
): { path: string; content: string }[] {
  const result: { path: string; content: string }[] = [];
  let totalChars = 0;

  for (const file of files) {
    const truncatedContent = truncateFile(file.content);
    const fileChars = file.path.length + truncatedContent.length + 10; // overhead

    if (totalChars + fileChars > maxChars) {
      const remaining = maxChars - totalChars;
      if (remaining > 500) {
        result.push({
          path: file.path,
          content: truncateFile(file.content, remaining - file.path.length - 50),
        });
      }
      break;
    }

    result.push({ path: file.path, content: truncatedContent });
    totalChars += fileChars;
  }

  return result;
}

function formatFilesForPrompt(files: { path: string; content: string }[]): string {
  return files
    .map((f) => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
    .join("\n\n");
}

type GeminiConfig = {
  apiKey?: string;
  model?: string;
};

export function createGeminiClient(config?: GeminiConfig) {
  const apiKey = config?.apiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY required");

  const ai = new GoogleGenAI({ apiKey });
  const model = config?.model || "gemini-2.5-flash";

  return {
    async *streamAnalysis(
      files: { path: string; content: string }[],
      prompt: string
    ): AsyncGenerator<string> {
      const truncatedFiles = truncateContext(files);
      const filesContent = formatFilesForPrompt(truncatedFiles);

      const fullPrompt = `${prompt}\n\nFiles:\n${filesContent}`;

      const response = await ai.models.generateContentStream({
        model,
        contents: fullPrompt,
      });

      for await (const chunk of response) {
        const text = chunk.text;
        if (text) yield text;
      }
    },

    async analyzeStructured(
      files: { path: string; content: string }[],
      prompt: string
    ): Promise<AnalysisResult> {
      const truncatedFiles = truncateContext(files);
      const filesContent = formatFilesForPrompt(truncatedFiles);

      const fullPrompt = `Analyze the following codebase and identify blockers, dependencies, and recommended actions.

${prompt}

Files:
${filesContent}`;

      const response = await ai.models.generateContent({
        model,
        contents: fullPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: analysisSchema,
        },
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from Gemini");

      return JSON.parse(text) as AnalysisResult;
    },

    async *streamChat(
      messages: { role: "user" | "model"; content: string }[],
      systemPrompt?: string
    ): AsyncGenerator<string> {
      const contents = messages.map((m) => ({
        role: m.role,
        parts: [{ text: m.content }],
      }));

      const response = await ai.models.generateContentStream({
        model,
        contents,
        config: systemPrompt ? { systemInstruction: systemPrompt } : undefined,
      });

      for await (const chunk of response) {
        const text = chunk.text;
        if (text) yield text;
      }
    },

    async generateJson<T>(prompt: string, schema: object): Promise<T> {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from Gemini");

      return JSON.parse(text) as T;
    },
  };
}

export type GeminiClient = ReturnType<typeof createGeminiClient>;
