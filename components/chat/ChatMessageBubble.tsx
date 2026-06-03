"use client";

export type ChatBubbleMessage = {
  role: string;
  content: string;
};

export function ChatMessageBubble({ message }: { message: ChatBubbleMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`text-sm rounded-2xl px-3 py-2 max-w-[92%] whitespace-pre-wrap ${
          isUser
            ? "bg-brand-600 text-white rounded-br-md"
            : "bg-gray-100 text-gray-800 rounded-bl-md"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}
