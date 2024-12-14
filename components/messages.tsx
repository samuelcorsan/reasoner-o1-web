import { ChatRequestOptions, Message } from "ai";
import { PreviewMessage, ThinkingMessage } from "./message";
import { useScrollToBottom } from "./use-scroll-to-bottom";
import { Overview } from "./overview";
import { UIBlock } from "./block";
import { Dispatch, memo, SetStateAction } from "react";
import { Vote } from "@/lib/db/schema";
import { Thought } from "@/lib/types";

interface MessagesProps {
  chatId: string;
  block: UIBlock;
  setBlock: Dispatch<SetStateAction<UIBlock>>;
  isLoading: boolean;
  votes: Array<Vote> | undefined;
  messages: Array<Message>;
  setMessages: (
    messages: Message[] | ((messages: Message[]) => Message[])
  ) => void;
  reload: (
    chatRequestOptions?: ChatRequestOptions
  ) => Promise<string | null | undefined>;
  isReadonly: boolean;
  chainOfThought: Thought[];
  setChainOfThought: Dispatch<SetStateAction<Thought[]>>;
}

function PureMessages({
  chatId,
  block,
  setBlock,
  isLoading,
  votes,
  messages,
  setMessages,
  reload,
  isReadonly,
  chainOfThought,
}: MessagesProps) {
  const [messagesContainerRef, messagesEndRef] =
    useScrollToBottom<HTMLDivElement>();

  const titles = chainOfThought.map((step) => step.title);

  return (
    <div
      ref={messagesContainerRef}
      className="flex flex-col min-w-0 gap-6 flex-1 overflow-y-scroll pt-4"
    >
      {messages.length === 0 && <Overview />}

      {messages.map((message, index) => (
        <PreviewMessage
          key={message.id}
          chatId={chatId}
          message={message}
          block={block}
          setBlock={setBlock}
          isLoading={isLoading && messages.length - 1 === index}
          vote={
            votes
              ? votes.find((vote) => vote.messageId === message.id)
              : undefined
          }
          setMessages={setMessages}
          reload={reload}
          isReadonly={isReadonly}
        />
      ))}

      {titles.length > 0 &&
        messages.length > 0 &&
        messages[messages.length - 1].role === "user" && (
          <ThinkingMessage chainOfThought={chainOfThought} />
        )}

      <div
        ref={messagesEndRef}
        className="shrink-0 min-w-[24px] min-h-[24px]"
      />
    </div>
  );
}

function areEqual(prevProps: MessagesProps, nextProps: MessagesProps) {
  if (
    prevProps.block.status === "streaming" &&
    nextProps.block.status === "streaming"
  ) {
    return true;
  }

  return false;
}

export const Messages = memo(PureMessages, areEqual);
