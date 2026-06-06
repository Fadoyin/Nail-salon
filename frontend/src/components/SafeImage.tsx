"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

type SafeImageProps = ImageProps & {
  fallbackClassName?: string;
};

export function SafeImage({
  fallbackClassName = "bg-gradient-to-br from-blush to-rose",
  alt,
  ...props
}: SafeImageProps) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center ${fallbackClassName} ${props.className ?? ""}`}
        style={props.fill ? { position: "absolute", inset: 0 } : { width: props.width, height: props.height }}
        aria-label={alt}
      >
        <span className="text-4xl opacity-60">🌸</span>
      </div>
    );
  }

  return (
    <Image
      {...props}
      alt={alt}
      onError={() => setError(true)}
    />
  );
}
