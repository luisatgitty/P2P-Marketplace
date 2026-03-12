"use client";

import { useState } from "react";

interface LocationFilterProps {
  onLocationChange?: (loc: string) => void;
}

const LOCATIONS = [
  { label: "All Locations",       value: ""                  },
  { label: "Laguna",              value: "Laguna"            },
  { label: "Calabarzon",          value: "Calabarzon"        },
  { label: "Calamba, Laguna",     value: "Calamba, Laguna"   },
  { label: "San Pablo, Laguna",   value: "San Pablo, Laguna" },
  { label: "Quezon City",         value: "Quezon City"       },
  { label: "Makati City",         value: "Makati City"       },
];

export default function LocationFilter({ onLocationChange }: LocationFilterProps) {
  const [selected, setSelected] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelected(val);
    onLocationChange?.(val);
  };

  return (
    <div className="bg-stone-50 dark:bg-[#13151f] border-b border-stone-200 dark:border-[#2a2d3e] sticky top-[121px] z-30">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-3 flex items-center gap-3">
        <label className="text-sm font-medium text-stone-700 dark:text-stone-300">Location:</label>
        <select
          value={selected}
          onChange={handleChange}
          className="bg-transparent dark:bg-[#1c1f2e] border border-stone-200 dark:border-[#2a2d3e] rounded-full text-sm text-stone-600 dark:text-stone-300 px-4 py-2 cursor-pointer outline-none hover:border-stone-400 dark:hover:border-stone-500 transition-colors"
        >
          {LOCATIONS.map((loc) => (
            <option key={loc.value} value={loc.value} className="bg-white dark:bg-[#1c1f2e] text-stone-800 dark:text-stone-200">
              {loc.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
