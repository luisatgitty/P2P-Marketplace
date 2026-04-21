"use client";

import { ShoppingCart, Tag, Key, Wrench } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { MessageTab } from "@/types/messaging";

export const MESSAGE_TABS: {
  id: MessageTab;
  label: string;
  Icon: React.ElementType;
}[] = [
  { id: "buying",   label: "Buy",   Icon: ShoppingCart  },
  { id: "selling",  label: "Sell",  Icon: Tag           },
  { id: "rental",   label: "Rent",   Icon: Key           },
  { id: "services", label: "Service", Icon: Wrench        },
];

interface MessagesTabNavProps {
  activeTab: MessageTab;
  onTabChange: (tab: MessageTab) => void;
}

export default function MessagesTabNav({
  activeTab,
  onTabChange,
}: MessagesTabNavProps) {
  return (
    <Tabs value={activeTab} className="w-full gap-0" aria-label="Message categories">
      <TabsList className="h-auto w-full justify-start bg-transparent p-0">
        {MESSAGE_TABS.map(({ id, label, Icon }) => (
          <TabsTrigger
            key={id}
            value={id}
            onClick={() => onTabChange(id)}
            aria-current={activeTab === id ? "page" : undefined}
            className={cn(
              "relative flex flex-none items-center rounded-lg px-2",
              "data-[state=active]:bg-slate-800 data-[state=active]:dark:bg-amber-800 data-[state=active]:text-white"
            )}
          >
            <Icon size={16} />
            <span
              className={cn(
                "overflow-hidden whitespace-nowrap text-xs sm:text-sm font-semibold transition-all duration-200",
                activeTab === id
                  ? "max-w-14 opacity-100"
                  : "max-w-0 opacity-0",
              )}
            >
              {label}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
