"use server";

import { type CoreUserMessage, generateText } from "ai";
import { cookies } from "next/headers";

import { groq } from "@ai-sdk/groq";
import {
  deleteAllChatsByUserId,
  deleteMessagesByChatIdAfterTimestamp,
  getMessageById,
  updateChatVisiblityById,
} from "@/lib/db/queries";
import { VisibilityType } from "@/components/visibility-selector";

export async function saveModelId(model: string) {
  const cookieStore = await cookies();
  cookieStore.set("model-id", model);
}

export async function generateTitleFromUserMessage({
  message,
}: {
  message: CoreUserMessage;
}) {
  const { text: title } = await generateText({
    model: groq("llama-3.1-8b-instant"),
    system: `You are an assistant who generates names for conversations based on the message provided, using a maximum of 4 to 5 words.

You analyze the message provided to identify the main themes or predominant focus. Use keywords and highlights to form a name that nicely summarizes the essence of the conversation, with a limit of 5 words.

# Steps

1. **Message Analysis**: Review the provided message and detect themes, keywords, and main concepts.
2. **Main Topic Identification**: Determine the focus or the most representative topic of the conversation.
3. **Name Formulation**: Use a maximum of 3 to 4 short words to effectively summarize the essence of the identified topic.
4. **Revision**: Verify that the name generated is clear and representative of the conversation.

# Output format

- The output should be a concise and clear name that reflects the content of the message, with a maximum length of 5 words. This is for the title of the chat. RETURN ONLY the title and nothing else, without any kind of indication. DO NOT use markdown, no ** or *.

# Examples of input and response

**Input**: 
- Message: ["I want to talk to you about new policies affecting companies in the United States."].

**Outcome**:
- Impact of new U.S. policies

(Note: Actual examples should be adapted to specific contexts using the messages provided as a basis).

# Notes
- Check the relevance of each keyword chosen for the final name.`,
    prompt: `Create a title for this message: ${JSON.stringify(message)}`,
  });

  return title;
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const [message] = await getMessageById({ id });

  await deleteMessagesByChatIdAfterTimestamp({
    chatId: message.chatId,
    timestamp: message.createdAt,
  });
}

export async function updateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  await updateChatVisiblityById({ chatId, visibility });
}

export async function deleteAllChats() {
  await deleteAllChatsByUserId();
}
