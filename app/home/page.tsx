"use client"

import { useState, useEffect } from "react"
import { Search } from "lucide-react"
import PDFList from "@/components/pdf-list"
import AdminPanel from "@/components/admin-panel"
import SearchBar from "@/components/search-bar"
import AdminLogin from "@/components/admin-login"

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [showAdmin, setShowAdmin] = useState(false)
  const [adminLoggedIn, setAdminLoggedIn] = useState(false)
  const [pdfs, setPdfs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPDFs()
  }, [])

  const loadPDFs = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/pdfs")
      if (res.ok) {
        const data = await res.json()
        setPdfs(data)
      }
    } catch (error) {
      console.error("Failed to load PDFs:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredPdfs = pdfs.filter((pdf) => pdf.name.toLowerCase().includes(searchQuery.toLowerCase()))

  if (showAdmin && !adminLoggedIn) {
    return <AdminLogin onLoginSuccess={() => setAdminLoggedIn(true)} onBack={() => setShowAdmin(false)} />
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-primary text-white p-4 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 100 100" className="w-8 h-8" xmlns="http://www.w3.org/2000/svg">
              <path d="M 30 25 L 35 25 L 35 75 L 30 75 Q 25 75 25 70 L 25 30 Q 25 25 30 25" fill="#ffffff" />
              <rect x="37" y="25" width="25" height="50" fill="#f0f4f8" rx="2" />
              <rect x="39" y="27" width="21" height="46" fill="#1e40af" rx="1" />
              <rect x="63" y="25" width="25" height="50" fill="#f0f4f8" rx="2" />
              <rect x="65" y="27" width="21" height="46" fill="#1e40af" rx="1" />
            </svg>
            <h1 className="text-2xl font-bold">Padho</h1>
          </div>
          <button
            onClick={() => {
              if (adminLoggedIn) {
                setShowAdmin(!showAdmin)
              } else {
                setShowAdmin(true)
              }
            }}
            className="bg-primary-light hover:bg-accent px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            {showAdmin ? "View PDFs" : "Admin"}
          </button>
        </div>

        {!showAdmin && <SearchBar value={searchQuery} onChange={setSearchQuery} />}
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {showAdmin ? (
          <AdminPanel onUploadSuccess={loadPDFs} />
        ) : (
          <>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary-light border-t-primary rounded-full animate-spin"></div>
              </div>
            ) : filteredPdfs.length === 0 ? (
              <div className="text-center py-12">
                <Search className="w-12 h-12 mx-auto text-muted mb-4 opacity-50" />
                <p className="text-muted text-lg">
                  {pdfs.length === 0 ? "No PDFs available yet" : "No PDFs match your search"}
                </p>
              </div>
            ) : (
              <PDFList pdfs={filteredPdfs} onDelete={loadPDFs} isAdmin={adminLoggedIn} />
            )}
          </>
        )}
      </main>
    </div>
  )
}
