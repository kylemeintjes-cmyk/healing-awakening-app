type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

type LocalChatOptions = {
  temperature?: number;
  maxTokens?: number;
};

type OpenAIChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

export async function localChat(messages: ChatMessage[], options?: LocalChatOptions) {
  const baseUrl = getRequiredEnv("LOCAL_LLM_BASE_URL");
  const model = getRequiredEnv("LOCAL_LLM_MODEL");
  const timeoutMs = Number(process.env.LOCAL_LLM_TIMEOUT_MS ?? 45000);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 220,
        messages,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Local LLM request failed: ${response.status}`);
    }

    const payload = (await response.json()) as OpenAIChatCompletionResponse;
    return payload.choices?.[0]?.message?.content?.trim() ?? "";
  } finally {
    clearTimeout(timeout);
  }
}
