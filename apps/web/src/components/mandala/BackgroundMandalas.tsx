"use client";
import React from "react";

interface BackgroundMandalasProps {
  variant?: "landing" | "dashboard";
}

export function BackgroundMandalas({ variant = "landing" }: BackgroundMandalasProps = {}) {
  const outerAngles = [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320, 340];
  const smallAngles = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

  return (
    <>
      <svg className="mandala-left" viewBox="0 0 600 600">
        <g transform="translate(300 300)" fill="none" stroke="#2A1503" strokeWidth="2">
          <defs>
            <path
              id="outerPetal"
              d="M0,-260 C45,-200 45,-100 0,-40 C-45,-100 -45,-200 0,-260 Z"
              fill="none"
            />
          </defs>
          <g fill="none">
            {outerAngles.map((angle) => (
              <use
                key={angle}
                href="#outerPetal"
                transform={angle === 0 ? undefined : `rotate(${angle})`}
              />
            ))}
          </g>
          <circle r="200" stroke="#8B4513" fill="none" />
          <circle r="160" stroke="#000" fill="none" />
          <circle r="120" stroke="#C19A6B" fill="none" />
          <circle r="90" fill="none" />
          <circle r="65" fill="none" />
          <circle r="40" fill="none" />
          <circle r="12" fill="#2A1503" />
        </g>
      </svg>

      <svg className="mandala-right" viewBox="0 0 600 600">
        <g transform="translate(300 300)" fill="none" stroke="#2A1503" strokeWidth="2">
          <defs>
            <path
              id="outerPetalSmall"
              d="M0,-200 C35,-150 35,-80 0,-30 C-35,-80 -35,-150 0,-200 Z"
              fill="none"
            />
          </defs>
          <g fill="none">
            {smallAngles.map((angle) => (
              <use
                key={angle}
                href="#outerPetalSmall"
                transform={angle === 0 ? undefined : `rotate(${angle})`}
              />
            ))}
          </g>
          <circle r="150" stroke="#8B4513" fill="none" />
          <circle r="110" stroke="#000" fill="none" />
          <circle r="12" fill="#2A1503" />
        </g>
      </svg>
    </>
  );
}

export default BackgroundMandalas;
