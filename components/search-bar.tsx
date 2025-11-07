"use client"

import { Search } from "lucide-react"

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white opacity-70" />
      <input
        type="text"
        placeholder="Search PDFs..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-primary-light text-white placeholder-white placeholder-opacity-60 rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-white"
      />
    </div>
  )
}
