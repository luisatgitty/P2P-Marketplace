"use client";

import { useState } from "react";

interface LocationFilterProps {
  onLocationChange?: (loc: string) => void;
}

const LOCATIONS = [
  { label: "All Locations", value: "" },
  { label: "Laguna", value: "Laguna" },
  { label: "Calabarzon", value: "Calabarzon" },
  { label: "Calamba, Laguna", value: "Calamba, Laguna" },
  { label: "San Pablo, Laguna", value: "San Pablo, Laguna" },
  { label: "Quezon City", value: "Quezon City" },
  { label: "Makati City", value: "Makati City" },
];

export default function LocationFilter({ onLocationChange }: LocationFilterProps) {
  const [selected, setSelected] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelected(val);
    onLocationChange?.(val);
  };

  return (
    <div className="bg-stone-50 border-b border-stone-200 sticky top-[110px] z-30">{/* positioned just below CategoryFilter */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-3 flex items-center gap-3">
        <label className="text-sm font-medium text-stone-700">Location:</label>
        <select
          value={selected}
          onChange={handleChange}
          className="bg-transparent border border-stone-200 rounded-full text-sm text-stone-600 px-4 py-2 cursor-pointer outline-none hover:border-stone-400 transition-colors"
        >
          {LOCATIONS.map((loc) => (
            <option key={loc.value} value={loc.value}>
              {loc.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
