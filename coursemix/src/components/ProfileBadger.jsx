"use client";

import { useState, useEffect } from "react";

export default function ProfileBadger({ activeInput, inputValue }) {
  const [eyeOffset, setEyeOffset] = useState(0);
  const [isBlinking, setIsBlinking] = useState(false);
  const [isWinking, setIsWinking] = useState(false);
  const [blinkInterval, setBlinkInterval] = useState(null);
  const [headRotation, setHeadRotation] = useState(0);

  // Update eye position based on the input value only if not in password mode.
  useEffect(() => {
    if (
      activeInput &&
      !activeInput.toLowerCase().includes("password") &&
      inputValue
    ) {
      const position = inputValue.length / 30; // Normalize the text length
      const newEyeOffset = Math.min(Math.max((position - 0.5) * 16, -8), 8);
      setEyeOffset(newEyeOffset);
    } else {
      setEyeOffset(0);
    }
  }, [activeInput, inputValue]);

  // Handle blinking and winking animations
  useEffect(() => {
    // Blink both eyes every 4-8 seconds
    const blinkInterval = setInterval(() => {
      if (!isWinking) {
        // Don't blink if already winking
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 200);
      }
    }, Math.random() * 4000 + 4000);

    // Wink right eye every 8-15 seconds
    const winkInterval = setInterval(() => {
      if (!isBlinking) {
        // Don't wink if already blinking
        setIsWinking(true);
        setTimeout(() => setIsWinking(false), 300);
      }
    }, Math.random() * 7000 + 8000);

    return () => {
      clearInterval(blinkInterval);
      clearInterval(winkInterval);
    };
  }, [isBlinking, isWinking]);

  // Add subtle head rotations to mimic natural micro-movements.
  useEffect(() => {
    const headRotationInterval = setInterval(() => {
      // Rotate between -5 and 5 degrees
      const newRotation = (Math.random() - 0.5) * 10;
      setHeadRotation(newRotation);
    }, 3000);

    return () => clearInterval(headRotationInterval);
  }, []);

  return (
    <div className="w-32 h-32 mx-auto mb-8 relative">
      <div
        className="w-full h-full relative transform transition-transform duration-1000"
        style={{ transform: `rotate(${headRotation}deg)` }}
      >
        <div
          className="absolute inset-0 rounded-full shadow-lg"
          style={{
            background: "radial-gradient(circle at 30% 30%, #555, #222)",
          }}
        >
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-full bg-white rounded-full opacity-90" />
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-2 h-24 bg-black rounded" />
          <div className="absolute top-2 left-1/2 transform -translate-x-[calc(50%+6px)] w-2 h-20 bg-black rounded" />
          <div className="absolute top-2 left-1/2 transform -translate-x-[calc(50%-6px)] w-2 h-20 bg-black rounded" />

          <div
            className="absolute -top-1 -left-1 w-8 h-8 rounded-full shadow-md"
            style={{
              background: "radial-gradient(circle at 30% 30%, #333, #000)",
            }}
          />
          <div
            className="absolute -top-1 -right-1 w-8 h-8 rounded-full shadow-md"
            style={{
              background: "radial-gradient(circle at 70% 30%, #333, #000)",
            }}
          />

          {activeInput?.toLowerCase().includes("password") ? (
            <>
              <div className="absolute top-[42%] left-1/4 w-4 h-1 bg-black rounded-full" />
              <div className="absolute top-[42%] right-1/4 w-4 h-1 bg-black rounded-full" />
            </>
          ) : (
            <>
              <div
                className="absolute top-[40%] left-1/4 w-4 h-[16px] bg-white rounded-full overflow-hidden shadow-inner"
                style={{ transform: `translateX(${eyeOffset}px)` }}
              >
                <div
                  className={`w-2.5 h-2.5 bg-black rounded-full relative top-1 left-0.5 transition-all duration-300 ${
                    isBlinking ? "transform translate-y-4" : ""
                  }`}
                />
              </div>
              <div
                className="absolute top-[40%] right-1/4 w-4 h-[16px] bg-white rounded-full overflow-hidden shadow-inner"
                style={{ transform: `translateX(${eyeOffset}px)` }}
              >
                <div
                  className={`w-2.5 h-2.5 bg-black rounded-full relative top-1 left-0.5 transition-all duration-300 ${
                    isBlinking || isWinking ? "transform translate-y-4" : ""
                  }`}
                />
              </div>
            </>
          )}

          <div
            className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-12 h-8 rounded-full"
            style={{ background: "linear-gradient(145deg, #222, #000)" }}
          />
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-5 h-3 bg-gray-800 rounded-full" />
        </div>
      </div>
    </div>
  );
}
