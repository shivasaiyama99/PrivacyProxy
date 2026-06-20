"use client";

import React, { useEffect, useState, useCallback } from "react";

interface TypingAnimationProps {
  text: string;
  typeSpeed?: number;
  deleteSpeed?: number;
  pauseDuration?: number;
  className?: string;
}

export function TypingAnimation({
  text,
  typeSpeed = 80,
  deleteSpeed = 40,
  pauseDuration = 2000,
  className = "",
}: TypingAnimationProps) {
  const [displayed, setDisplayed] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const tick = useCallback(() => {
    if (!isDeleting) {
      // Typing forward
      if (displayed.length < text.length) {
        return typeSpeed + Math.random() * 40; // slight randomness
      } else {
        // Finished typing — pause, then start deleting
        setIsDeleting(true);
        return pauseDuration;
      }
    } else {
      // Deleting backward
      if (displayed.length > 0) {
        return deleteSpeed;
      } else {
        // Finished deleting — start typing again
        setIsDeleting(false);
        return 500; // brief pause before retyping
      }
    }
  }, [displayed, isDeleting, text, typeSpeed, deleteSpeed, pauseDuration]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (displayed.length < text.length) {
          setDisplayed(text.slice(0, displayed.length + 1));
        }
      } else {
        if (displayed.length > 0) {
          setDisplayed(text.slice(0, displayed.length - 1));
        }
      }
    }, tick());

    return () => clearTimeout(timeout);
  }, [displayed, isDeleting, text, tick]);

  return (
    <span className={className}>
      {displayed}
      <span className="animate-pulse text-[#00ff88]">▎</span>
    </span>
  );
}
