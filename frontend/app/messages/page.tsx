import { MessageSquare } from "lucide-react";

export default function MessagesPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-[#faf6f0] dark:bg-[#111827] p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-white/80 dark:bg-[#1c1f2e] border border-border shadow-sm flex items-center justify-center">
        <MessageSquare size={28} className="text-stone-300 dark:text-stone-600" />
      </div>
      <div>
        <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">
          Select a conversation
        </p>
        <p className="text-xs text-stone-400 dark:text-stone-600 mt-1 max-w-[180px] mx-auto leading-relaxed">
          Choose a message from the list to start chatting
        </p>
      </div>
    </div>
  );
}
