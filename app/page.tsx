"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function SplashScreen() {
  const router = useRouter()
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false)
      router.push("/home")
    }, 3500)

    return () => clearTimeout(timer)
  }, [router])

  if (!showSplash) return null

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary via-primary-light to-primary-light">
      {/* Logo Animation */}
      <div className="animate-fade-in-scale mb-6">
        <div className="w-24 h-24 relative animate-pulse-slow">
          <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="48" fill="#ffffff" opacity="0.2" />
            <path d="M 30 25 L 35 25 L 35 75 L 30 75 Q 25 75 25 70 L 25 30 Q 25 25 30 25" fill="#ffffff" />
            <rect x="37" y="25" width="25" height="50" fill="#f0f4f8" rx="2" />
            <rect x="39" y="27" width="21" height="46" fill="#ffffff" rx="1" />
            <line x1="43" y1="32" x2="56" y2="32" stroke="#1e40af" strokeWidth="2" strokeLinecap="round" />
            <line
              x1="43"
              y1="38"
              x2="56"
              y2="38"
              stroke="#1e40af"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.6"
            />
            <line
              x1="43"
              y1="44"
              x2="56"
              y2="44"
              stroke="#1e40af"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.6"
            />
            <line
              x1="43"
              y1="50"
              x2="56"
              y2="50"
              stroke="#1e40af"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.6"
            />
            <line
              x1="43"
              y1="56"
              x2="56"
              y2="56"
              stroke="#1e40af"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.6"
            />
            <line
              x1="43"
              y1="62"
              x2="53"
              y2="62"
              stroke="#1e40af"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.6"
            />
            <rect x="63" y="25" width="25" height="50" fill="#f0f4f8" rx="2" />
            <rect x="65" y="27" width="21" height="46" fill="#ffffff" rx="1" />
            <rect x="83" y="20" width="6" height="30" fill="#ef4444" rx="1" />
          </svg>
        </div>
      </div>

      {/* App Name */}
      <h1 className="animate-slide-up text-4xl font-bold text-white mb-2">Padho</h1>
      <p className="animate-slide-up text-white text-opacity-80 text-sm">Read. Search. Download.</p>

      {/* Loading indicator */}
      <div className="mt-12">
        <div className="flex gap-2">
          <div className="w-2 h-2 rounded-full bg-white animate-pulse-slow"></div>
          <div className="w-2 h-2 rounded-full bg-white animate-pulse-slow" style={{ animationDelay: "0.2s" }}></div>
          <div className="w-2 h-2 rounded-full bg-white animate-pulse-slow" style={{ animationDelay: "0.4s" }}></div>
        </div>
      </div>
    </div>
  )
}
