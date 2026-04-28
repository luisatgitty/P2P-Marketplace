import { useEffect, useState } from 'react';

import { Input } from '@/components/ui/input';

interface NumberInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  className?: string;
}

export function NumberInput({
  value,
  onChange,
  placeholder = 'Enter numbers...',
  maxLength = 10,
  className,
}: NumberInputProps) {
  const [characterCount, setCharacterCount] = useState(0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove non-digits and enforce the max length
    const digitsOnly = e.target.value.replace(/\D/g, '');
    const limitedValue = digitsOnly.slice(0, maxLength);

    // Send the cleaned string back to the parent
    onChange(limitedValue);
    setCharacterCount(limitedValue.length);
  };

  // Update character count on initial render
  useEffect(() => {
    setCharacterCount(value.length);
  });

  return (
    <div className="relative w-full">
      <Input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={`peer dark:bg-[#13151f] dark:border-[#2a2d3e] ${className}`}
      />
      <span className="text-muted-foreground pointer-events-none absolute inset-y-0 right-0 flex items-center justify-center pr-3 text-xs tabular-nums peer-disabled:opacity-50">
        {characterCount}/{maxLength}
      </span>
    </div>
  );
}
