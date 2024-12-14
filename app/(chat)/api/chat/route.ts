import {
  type Message,
  StreamData,
  convertToCoreMessages,
  generateText,
  streamObject,
  streamText,
} from "ai";
import { z } from "zod";

import { auth } from "@/app/(auth)/auth";
import { customModel } from "@/lib/ai";
import { models } from "@/lib/ai/models";
import { systemPrompt } from "@/lib/ai/prompts";
import {
  deleteChatById,
  getChatById,
  getDocumentById,
  saveChat,
  saveDocument,
  saveMessages,
  saveSuggestions,
} from "@/lib/db/queries";
import type { Suggestion } from "@/lib/db/schema";
import {
  executeJavaScript,
  generateUUID,
  getMostRecentUserMessage,
  sanitizeResponseMessages,
} from "@/lib/utils";

import { generateTitleFromUserMessage } from "../../actions";

export const maxDuration = 60;

type AllowedTools =
  | "createDocument"
  | "updateDocument"
  | "requestSuggestions"
  | "getWeather";

const blocksTools: AllowedTools[] = [
  "createDocument",
  "updateDocument",
  "requestSuggestions",
];

const weatherTools: AllowedTools[] = ["getWeather"];

const allTools: AllowedTools[] = [...blocksTools, ...weatherTools];

export async function POST(request: Request) {
  const {
    id,
    messages,
    modelId,
    iterations,
    cot,
  }: {
    id: string;
    messages: Array<Message>;
    modelId: string;
    iterations: number;
    cot: any;
  } = await request.json();

  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const model = models.find((model) => model.id === modelId);

  if (!model) {
    return new Response("Model not found", { status: 404 });
  }

  const coreMessages = convertToCoreMessages(messages);
  const userMessage = getMostRecentUserMessage(coreMessages);

  if (!userMessage) {
    return new Response("No user message found", { status: 400 });
  }

  const chat = await getChatById({ id });

  if (!chat) {
    const title = await generateTitleFromUserMessage({ message: userMessage });
    await saveChat({ id, userId: session.user.id, title });
  }

  const userMessageId = generateUUID();

  await saveMessages({
    messages: [
      { ...userMessage, id: userMessageId, createdAt: new Date(), chatId: id },
    ],
  });

  const streamingData = new StreamData();

  streamingData.append({
    type: "user-message-id",
    content: userMessageId,
  });

  let intermediateResponse = userMessage.content;

  for (let i = 0; i < iterations; i++) {
    let plainTextResponse = "";

    if (Array.isArray(intermediateResponse)) {
      plainTextResponse = intermediateResponse
        .filter((part) => typeof part === "string" || part.type === "text") // Filtrar solo texto
        .map((part) => (typeof part === "string" ? part : part))
        .join("\n");
    } else if (typeof intermediateResponse === "string") {
      plainTextResponse = intermediateResponse;
    } else {
      throw new Error("Unsupported format for intermediateResponse");
    }

    const jsCodeRegex = /```(?:javascript|js)\n([\s\S]*?)```/;
    const match = plainTextResponse.match(jsCodeRegex);

    let executionResult = null;

    if (match) {
      const jsCode = match[1];
      try {
        executionResult = executeJavaScript(jsCode);

        plainTextResponse = plainTextResponse.replace(
          jsCodeRegex,
          `JavaScript execution result: ${executionResult}`
        );
      } catch (error) {
        console.error("Error executing JavaScript code:", error);
        executionResult = `Error executing JavaScript: ${error}`;
        plainTextResponse = plainTextResponse.replace(
          jsCodeRegex,
          `JavaScript execution result: ${executionResult}`
        );
      }
    }

    const prompt =
      i === 0
        ? `Refine this solution to the problem: ${userMessage.content}\nThere is no previous answer. \nChain of thought: ${cot}`
        : `Refine this solution to the problem: ${userMessage.content}\nPrevious answer: ${intermediateResponse}\nChain of thought: ${cot}`;

    const { text } = await generateText({
      model: customModel(model.apiIdentifier),
      system: `You are an AI that refines solutions dynamically, using executable code only when necessary to obtain information from text or perform specific tasks that require it. For example, analyzing parts of texts, etc., which the AI may confuse because it divides into tokens and not letters. 
When asked to perform tasks that involve finding patterns in words or performing specific searches, such as identifying items within a list that meet certain conditions, use JavaScript code. Do not use libraries. Include everything in the same code if you use code and use the complete code, do not go half way because it is the necessary code that you must use for your reasoning. Remember in the code to use the words of the language in which you are spoken, if you are asked to order numbers in Spanish alphabetically you must write the series of numbers in Spanish. Try to make the code as simple as possible to avoid errors but without removing what makes it work. If you see code that is wrong you can also improve it. Always pay attention to what the resulting code says unless it is very strange, never play it down because it is almost always right, if the code says it, try to find an explanation and say what it returns.
However, for other types of answers, such as explanations or analyses that do not involve specific data processing, do not use code and provide the information directly. Remember to use the solutions according to the language in which they speak to you, if they ask you in Spanish, reason in Spanish and do everything in Spanish unless they tell you otherwise.`,
      prompt: prompt,
    });

    if (!text) {
      return new Response("Failed to generate text", { status: 500 });
    }

    if (typeof text === "string") {
      intermediateResponse = text;
    } else if (text && typeof text === "string") {
      intermediateResponse = text;
    } else {
      throw new Error("Invalid response format from generateText");
    }
  }

  const result = streamText({
    model: customModel(model.apiIdentifier),
    system: systemPrompt,
    prompt: `User input: ${userMessage.content}.\n\nChain of thought: ${cot}\n\nReasoning process and final conclusion: ${intermediateResponse}`,
    maxSteps: 5,
    experimental_activeTools: allTools,
    tools: {
      getWeather: {
        description: "Get the current weather at a location",
        parameters: z.object({
          latitude: z.number(),
          longitude: z.number(),
        }),
        execute: async ({ latitude, longitude }) => {
          const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`
          );

          const weatherData = await response.json();
          return weatherData;
        },
      },
      createDocument: {
        description: "Create a document for a writing activity",
        parameters: z.object({
          title: z.string(),
        }),
        execute: async ({ title }) => {
          const id = generateUUID();
          let draftText = "";

          streamingData.append({
            type: "id",
            content: id,
          });

          streamingData.append({
            type: "title",
            content: title,
          });

          streamingData.append({
            type: "clear",
            content: "",
          });

          const { fullStream } = streamText({
            model: customModel(model.apiIdentifier),
            system:
              "Write about the given topic. Markdown is supported. Use headings wherever appropriate.",
            prompt: title,
          });

          for await (const delta of fullStream) {
            const { type } = delta;

            if (type === "text-delta") {
              const { textDelta } = delta;

              draftText += textDelta;
              streamingData.append({
                type: "text-delta",
                content: textDelta,
              });
            }
          }

          streamingData.append({ type: "finish", content: "" });

          if (session.user?.id) {
            await saveDocument({
              id,
              title,
              content: draftText,
              userId: session.user.id,
            });
          }

          return {
            id,
            title,
            content: "A document was created and is now visible to the user.",
          };
        },
      },
      updateDocument: {
        description: "Update a document with the given description",
        parameters: z.object({
          id: z.string().describe("The ID of the document to update"),
          description: z
            .string()
            .describe("The description of changes that need to be made"),
        }),
        execute: async ({ id, description }) => {
          const document = await getDocumentById({ id });

          if (!document) {
            return {
              error: "Document not found",
            };
          }

          const { content: currentContent } = document;
          let draftText = "";

          streamingData.append({
            type: "clear",
            content: document.title,
          });

          const { fullStream } = streamText({
            model: customModel(model.apiIdentifier),
            system:
              "You are a helpful writing assistant. Based on the description, please update the piece of writing.",
            experimental_providerMetadata: {
              openai: {
                prediction: {
                  type: "content",
                  content: currentContent,
                },
              },
            },
            messages: [
              {
                role: "user",
                content: description,
              },
              { role: "user", content: currentContent },
            ],
          });

          for await (const delta of fullStream) {
            const { type } = delta;

            if (type === "text-delta") {
              const { textDelta } = delta;

              draftText += textDelta;
              streamingData.append({
                type: "text-delta",
                content: textDelta,
              });
            }
          }

          streamingData.append({ type: "finish", content: "" });

          if (session.user?.id) {
            await saveDocument({
              id,
              title: document.title,
              content: draftText,
              userId: session.user.id,
            });
          }

          return {
            id,
            title: document.title,
            content: "The document has been updated successfully.",
          };
        },
      },
      requestSuggestions: {
        description: "Request suggestions for a document",
        parameters: z.object({
          documentId: z
            .string()
            .describe("The ID of the document to request edits"),
        }),
        execute: async ({ documentId }) => {
          const document = await getDocumentById({ id: documentId });

          if (!document || !document.content) {
            return {
              error: "Document not found",
            };
          }

          const suggestions: Array<
            Omit<Suggestion, "userId" | "createdAt" | "documentCreatedAt">
          > = [];

          const { elementStream } = streamObject({
            model: customModel(model.apiIdentifier),
            system:
              "You are a help writing assistant. Given a piece of writing, please offer suggestions to improve the piece of writing and describe the change. It is very important for the edits to contain full sentences instead of just words. Max 5 suggestions.",
            prompt: document.content,
            output: "array",
            schema: z.object({
              originalSentence: z.string().describe("The original sentence"),
              suggestedSentence: z.string().describe("The suggested sentence"),
              description: z
                .string()
                .describe("The description of the suggestion"),
            }),
          });

          for await (const element of elementStream) {
            const suggestion = {
              originalText: element.originalSentence,
              suggestedText: element.suggestedSentence,
              description: element.description,
              id: generateUUID(),
              documentId: documentId,
              isResolved: false,
            };

            streamingData.append({
              type: "suggestion",
              content: suggestion,
            });

            suggestions.push(suggestion);
          }

          if (session.user?.id) {
            const userId = session.user.id;

            await saveSuggestions({
              suggestions: suggestions.map((suggestion) => ({
                ...suggestion,
                userId,
                createdAt: new Date(),
                documentCreatedAt: document.createdAt,
              })),
            });
          }

          return {
            id: documentId,
            title: document.title,
            message: "Suggestions have been added to the document",
          };
        },
      },
    },
    onFinish: async ({ response }) => {
      if (session.user?.id) {
        try {
          const responseMessagesWithoutIncompleteToolCalls =
            sanitizeResponseMessages(response.messages);

          await saveMessages({
            messages: responseMessagesWithoutIncompleteToolCalls.map(
              (message) => {
                const messageId = generateUUID();

                if (message.role === "assistant") {
                  streamingData.appendMessageAnnotation({
                    messageIdFromServer: messageId,
                  });
                }

                return {
                  id: messageId,
                  chatId: id,
                  role: message.role,
                  content: message.content,
                  createdAt: new Date(),
                };
              }
            ),
          });
        } catch (error) {
          console.error("Failed to save chat");
        }
      }

      streamingData.close();
    },
    experimental_telemetry: {
      isEnabled: true,
      functionId: "stream-text",
    },
  });

  return result.toDataStreamResponse({
    data: streamingData,
  });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Not Found", { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    await deleteChatById({ id });

    return new Response("Chat deleted", { status: 200 });
  } catch (error) {
    return new Response("An error occurred while processing your request", {
      status: 500,
    });
  }
}
