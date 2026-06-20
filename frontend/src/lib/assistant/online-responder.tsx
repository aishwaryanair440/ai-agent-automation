import type { AssistantRuntimeContext } from "@/context/assistant-context";
import { apiUrl } from "@/lib/api";

function normalizeMarkdown(text: string) {
  return text
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^(Step Overview)/gm, "## $1")
    .replace(/^(Step Type)/gm, "## $1")
    .replace(/^(Request Details)/gm, "## $1");
}

export type OnlineAssistantResponse = {
  reply: string;
  provider?: string;
  model?: string;
};

export async function onlineRespond(
  message: string,
  context?: AssistantRuntimeContext | null,
): Promise<OnlineAssistantResponse> {
  const res = await fetch(apiUrl("/assistant/chat"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
    body: JSON.stringify({ message, context }),
  });

  if (!res.ok) {
    const errData = await res.json();
    return {
      reply:
        errData.error ||
        "Failed to reach AI service. Please check configuration.",
    };
  }

  const data = await res.json();

  return {
    reply: normalizeMarkdown(data.reply) ?? "No response received from AI.",
    provider: data.provider,
    model: data.model,
  };
}
