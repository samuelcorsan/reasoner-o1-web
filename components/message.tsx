"use client";

import type { ChatRequestOptions, Message } from "ai";
import cx from "classnames";
import { AnimatePresence, motion } from "framer-motion";
import {
  memo,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import type { Vote } from "@/lib/db/schema";

import type { UIBlock } from "./block";
import { DocumentToolCall, DocumentToolResult } from "./document";
import { PencilEditIcon, SparklesIcon } from "./icons";
import { Markdown } from "./markdown";
import { MessageActions } from "./message-actions";
import { PreviewAttachment } from "./preview-attachment";
import { Weather } from "./weather";
import equal from "fast-deep-equal";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { MessageEditor } from "./message-editor";
import { Thought } from "@/lib/types";
import { ChevronDown, ChevronUp } from "lucide-react";

const PurePreviewMessage = ({
  chatId,
  message,
  block,
  setBlock,
  vote,
  isLoading,
  setMessages,
  reload,
  isReadonly,
}: {
  chatId: string;
  message: Message;
  block: UIBlock;
  setBlock: Dispatch<SetStateAction<UIBlock>>;
  vote: Vote | undefined;
  isLoading: boolean;
  setMessages: (
    messages: Message[] | ((messages: Message[]) => Message[])
  ) => void;
  reload: (
    chatRequestOptions?: ChatRequestOptions
  ) => Promise<string | null | undefined>;
  isReadonly: boolean;
}) => {
  const [mode, setMode] = useState<"view" | "edit">("view");

  return (
    <motion.div
      className="w-full mx-auto max-w-3xl px-4 group/message"
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      data-role={message.role}
    >
      <div
        className={cn(
          "flex gap-4 w-full group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl",
          {
            "w-full": mode === "edit",
            "group-data-[role=user]/message:w-fit": mode !== "edit",
          }
        )}
      >
        {message.role === "assistant" && (
          <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border">
            <SparklesIcon size={14} />
          </div>
        )}

        <div className="flex flex-col gap-2 w-full">
          {message.experimental_attachments && (
            <div className="flex flex-row justify-end gap-2">
              {message.experimental_attachments.map((attachment) => (
                <PreviewAttachment
                  key={attachment.url}
                  attachment={attachment}
                />
              ))}
            </div>
          )}

          {message.content && mode === "view" && (
            <div className="flex flex-row gap-2 items-start">
              {message.role === "user" && !isReadonly && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className="px-2 h-fit rounded-full text-muted-foreground opacity-0 group-hover/message:opacity-100"
                      onClick={() => {
                        setMode("edit");
                      }}
                    >
                      <PencilEditIcon />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit message</TooltipContent>
                </Tooltip>
              )}

              <div
                className={cn("flex flex-col gap-4", {
                  "bg-primary text-primary-foreground px-3 py-2 rounded-xl":
                    message.role === "user",
                })}
              >
                <Markdown>{message.content as string}</Markdown>
              </div>
            </div>
          )}

          {message.content && mode === "edit" && (
            <div className="flex flex-row gap-2 items-start">
              <div className="size-8" />

              <MessageEditor
                key={message.id}
                message={message}
                setMode={setMode}
                setMessages={setMessages}
                reload={reload}
              />
            </div>
          )}

          {message.toolInvocations && message.toolInvocations.length > 0 && (
            <div className="flex flex-col gap-4">
              {message.toolInvocations.map((toolInvocation) => {
                const { toolName, toolCallId, state, args } = toolInvocation;

                if (state === "result") {
                  const { result } = toolInvocation;

                  return (
                    <div key={toolCallId}>
                      {toolName === "getWeather" ? (
                        <Weather weatherAtLocation={result} />
                      ) : toolName === "createDocument" ? (
                        <DocumentToolResult
                          type="create"
                          result={result}
                          block={block}
                          setBlock={setBlock}
                          isReadonly={isReadonly}
                        />
                      ) : toolName === "updateDocument" ? (
                        <DocumentToolResult
                          type="update"
                          result={result}
                          block={block}
                          setBlock={setBlock}
                          isReadonly={isReadonly}
                        />
                      ) : toolName === "requestSuggestions" ? (
                        <DocumentToolResult
                          type="request-suggestions"
                          result={result}
                          block={block}
                          setBlock={setBlock}
                          isReadonly={isReadonly}
                        />
                      ) : (
                        <pre>{JSON.stringify(result, null, 2)}</pre>
                      )}
                    </div>
                  );
                }
                return (
                  <div
                    key={toolCallId}
                    className={cx({
                      skeleton: ["getWeather"].includes(toolName),
                    })}
                  >
                    {toolName === "getWeather" ? (
                      <Weather />
                    ) : toolName === "createDocument" ? (
                      <DocumentToolCall
                        type="create"
                        args={args}
                        setBlock={setBlock}
                        isReadonly={isReadonly}
                      />
                    ) : toolName === "updateDocument" ? (
                      <DocumentToolCall
                        type="update"
                        args={args}
                        setBlock={setBlock}
                        isReadonly={isReadonly}
                      />
                    ) : toolName === "requestSuggestions" ? (
                      <DocumentToolCall
                        type="request-suggestions"
                        args={args}
                        setBlock={setBlock}
                        isReadonly={isReadonly}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}

          {!isReadonly && (
            <MessageActions
              key={`action-${message.id}`}
              chatId={chatId}
              message={message}
              vote={vote}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
};

export const PreviewMessage = memo(
  PurePreviewMessage,
  (prevProps, nextProps) => {
    if (prevProps.isLoading !== nextProps.isLoading) return false;
    if (prevProps.isLoading && nextProps.isLoading) return false;
    if (prevProps.message.content && nextProps.message.content) return false;
    if (!equal(prevProps.vote, nextProps.vote)) return false;
    return true;
  }
);

export const ThinkingMessage = ({
  chainOfThought,
}: {
  chainOfThought: Thought[];
}) => {
  const role = "assistant";
  const [currentStep, setCurrentStep] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const titles = chainOfThought.map((step) => step.title);

  useEffect(() => {
    if (currentStep < titles.length - 1) {
      const timer = setTimeout(() => setCurrentStep(currentStep + 1), 3000);
      return () => clearTimeout(timer);
    }
  }, [currentStep, titles.length]);

  const visibleSteps = showAll ? chainOfThought : chainOfThought.slice(0, 3);

  return (
    <motion.div
      className="w-full mx-auto max-w-3xl px-4 group/message"
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1, transition: { delay: 1 } }}
      data-role={role}
    >
      <div className="flex gap-4 group-data-[role=user]/message:px-3 w-full group-data-[role=user]/message:w-fit group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl group-data-[role=user]/message:py-2 rounded-xl group-data-[role=user]/message:bg-muted">
        <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border">
          <SparklesIcon size={14} />
        </div>

        <div className="flex flex-col gap-2 w-full">
          <div className="flex flex-col gap-4 text-muted-foreground">
            <button
              className="text-left w-full flex items-center justify-between font-semibold mb-4 focus:outline-none"
              onClick={() => {
                setIsExpanded(!isExpanded);
                setCurrentStep((prev) => (prev + 1) % titles.length);
              }}
            >
              <AnimatePresence mode="wait">
                <motion.p
                  key={currentStep}
                  initial={{
                    opacity: 0,
                    y: currentStep === titles.length - 1 ? 0 : 20,
                  }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{
                    opacity: 0,
                    y: currentStep === titles.length - 1 ? 0 : -20,
                  }}
                  transition={{ duration: 0.5 }}
                  className="text-lg text-zinc-400 font-medium"
                >
                  {titles[currentStep]}
                </motion.p>
                <motion.div
                  className="ml-2"
                  initial={{ rotate: 0 }}
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-zinc-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-zinc-400" />
                  )}
                </motion.div>
              </AnimatePresence>
            </button>
          </div>
          <div className="space-y-4">
            {visibleSteps.map((step, index) => (
              <div
                key={index}
                className={`transition-opacity duration-300 ${
                  isExpanded ? "opacity-100" : "opacity-0 h-0 overflow-hidden"
                }`}
              >
                <h3 key={step.title} className="font-semibold mb-1 text-white">
                  {step.title}
                </h3>

                <p key={step.content} className="text-gray-300">
                  {step.content}
                </p>
              </div>
            ))}
            {!showAll && isExpanded && chainOfThought.length > 3 && (
              <Button onClick={() => setShowAll(true)} className="mt-4">
                See more
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
