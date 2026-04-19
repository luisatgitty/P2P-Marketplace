"use client";

import Image from "next/image";

export function Banner() {
  return (
    <div className="bg-muted relative hidden md:block">
      <Image
        src="https://plus.unsplash.com/premium_vector-1737082359286-f2b8f1ac7c9d?q=80&w=880"
        alt="Authentication Banner"
        loading="eager"
        fill
        className="dark:brightness-[0.6]"
        style={{ objectFit: 'cover' }}
      />
    </div>
  );
}

export function Container({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-muted flex flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        {children}
      </div>
    </div>
  );
}
