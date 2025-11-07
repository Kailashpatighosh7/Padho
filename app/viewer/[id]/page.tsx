"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Download, ChevronLeft, ChevronRight } from "lucide-react"
import PadhoDialog from "@/components/padho-dialog"

interface PDF {
  id: string
  name: string
  url: string
  size: number
  uploadedAt: string
}

export default function PDFViewer() {
  const params = useParams()
  const router = useRouter()
  const [pdf, setPdf] = useState<PDF | null>(null)
  const [loading, setLoading] = useState(true)
  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [showDownloadDialog, setShowDownloadDialog] = useState(false)
  const [pageInput, setPageInput] = useState("") // Add state for direct page input
  const renderTaskRef = useRef<any>(null)
  const isRenderingRef = useRef(false)

  useEffect(() => {
    const loadPDF = async () => {
      try {
        const res = await fetch("/api/pdfs")
        if (res.ok) {
          const pdfs = await res.json()
          console.log("[v0] All PDFs:", pdfs)
          const found = pdfs.find((p: PDF) => p.id === params.id)
          console.log("[v0] Found PDF:", found)
          if (found) {
            setPdf(found)
            // Load PDF.js library
            const script = document.createElement("script")
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
            script.onload = () => {
              console.log("[v0] PDF.js loaded successfully")
              initializePDF(found.url)
            }
            script.onerror = () => {
              console.error("[v0] Failed to load PDF.js library")
            }
            document.body.appendChild(script)
          } else {
            console.log("[v0] PDF not found in list with id:", params.id)
          }
        }
      } catch (error) {
        console.error("[v0] Failed to load PDF:", error)
      } finally {
        setLoading(false)
      }
    }

    loadPDF()
  }, [params.id])

  const initializePDF = async (pdfUrl: string) => {
    try {
      console.log("[v0] Initializing PDF from URL:", pdfUrl)
      const pdfjsLib = (window as any).pdfjsLib
      if (!pdfjsLib) {
        console.error("[v0] PDF.js library not available")
        return
      }
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"

      // Use the direct PDF URL instead of going through the download API
      const pdf = await pdfjsLib.getDocument(pdfUrl).promise
      console.log("[v0] PDF loaded, pages:", pdf.numPages)
      setPdfDoc(pdf)
      setTotalPages(pdf.numPages)
      renderPage(pdf, 1)
    } catch (error) {
      console.error("[v0] Failed to initialize PDF:", error)
    }
  }

  const renderPage = async (pdf: any, pageNum: number) => {
    try {
      if (isRenderingRef.current) {
        console.log("[v0] Skipping render - already rendering")
        return
      }

      // Cancel previous render if still in progress
      if (renderTaskRef.current) {
        console.log("[v0] Cancelling previous render task")
        renderTaskRef.current.cancel()
        renderTaskRef.current = null
      }

      isRenderingRef.current = true

      const page = await pdf.getPage(pageNum)
      const canvas = document.getElementById("pdf-canvas") as HTMLCanvasElement
      if (!canvas) {
        isRenderingRef.current = false
        return
      }

      const scale = Math.min(window.devicePixelRatio || 1, 2)
      const viewport = page.getViewport({ scale })
      canvas.width = viewport.width
      canvas.height = viewport.height

      const renderContext = {
        canvasContext: canvas.getContext("2d"),
        viewport: viewport,
      }

      const task = page.render(renderContext)
      renderTaskRef.current = task
      await task.promise
      renderTaskRef.current = null
    } catch (error) {
      if (error instanceof Error && error.message === "Rendering cancelled") {
        console.log("[v0] Previous render was cancelled")
      } else {
        console.error("[v0] Failed to render page:", error)
      }
    } finally {
      isRenderingRef.current = false
    }
  }

  useEffect(() => {
    if (pdfDoc && !isRenderingRef.current) {
      renderPage(pdfDoc, currentPage)
    }
  }, [currentPage, pdfDoc])

  const handleDownloadClick = () => {
    setShowDownloadDialog(true)
  }

  const handleConfirmDownload = async () => {
    setShowDownloadDialog(false)
    if (!pdf) return
    try {
      // Use the direct PDF URL from blob storage instead of the download API
      const res = await fetch(pdf.url)
      if (!res.ok) throw new Error("Download failed")

      const buffer = await res.arrayBuffer()
      const blob = new Blob([buffer], { type: "application/pdf" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = pdf.name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Download error:", error)
      alert("Failed to download PDF")
    }
  }

  const goToPreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1)
  }

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1)
  }

  const goToPage = (pageNum: number) => {
    // Validate page number
    if (pageNum < 1 || pageNum > totalPages) {
      alert(`Please enter a page number between 1 and ${totalPages}`)
      setPageInput("")
      return
    }
    setCurrentPage(pageNum)
    setPageInput("")
  }

  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const pageNum = Number.parseInt(pageInput, 10)
      goToPage(pageNum)
    }
  }

  const handleGoClick = () => {
    const pageNum = Number.parseInt(pageInput, 10)
    if (isNaN(pageNum)) {
      alert("Please enter a valid page number")
      return
    }
    goToPage(pageNum)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-light border-t-primary rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!pdf) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <p className="text-muted text-lg mb-4">PDF not found</p>
        <button
          onClick={() => router.push("/home")}
          className="bg-primary hover:bg-primary-light text-white px-4 py-2 rounded-lg transition-colors"
        >
          Back to PDFs
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-primary text-white p-3 md:p-4 shadow-lg">
        <div className="flex items-center justify-between gap-2 md:gap-4">
          <button
            onClick={() => router.push("/home")}
            className="hover:bg-primary-light p-2 rounded-lg transition-colors flex-shrink-0"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
          </button>
          <h1 className="text-base md:text-xl font-bold truncate flex-1 min-w-0">{pdf.name}</h1>
          <button
            onClick={handleDownloadClick}
            className="bg-primary-light hover:bg-accent text-white p-2 rounded-lg transition-colors flex-shrink-0"
            title="Download"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* PDF Viewer */}
      <main className="p-2 md:p-4 pb-32">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="flex justify-center bg-gray-100">
            <canvas id="pdf-canvas" className="max-w-full h-auto" style={{ display: "block" }} />
          </div>
        </div>

        {/* Page Navigation */}
        {totalPages > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 md:p-4 shadow-lg">
            <div className="max-w-4xl mx-auto">
              {/* Primary Navigation (Previous/Next) */}
              <div className="flex items-center justify-center gap-3 md:gap-6 mb-3">
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className="p-2 md:p-3 rounded-lg bg-primary hover:bg-primary-light text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:scale-95"
                  title="Previous page"
                >
                  <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                </button>
                <span className="text-base md:text-lg font-semibold min-w-fit">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className="p-2 md:p-3 rounded-lg bg-primary hover:bg-primary-light text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:scale-95"
                  title="Next page"
                >
                  <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
                </button>
              </div>

              {/* Direct Page Jump */}
              <div className="flex items-center justify-center gap-2">
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  onKeyDown={handlePageInputKeyDown}
                  placeholder="Go to page..."
                  className="w-24 md:w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={handleGoClick}
                  className="px-4 md:px-6 py-2 bg-primary hover:bg-primary-light text-white rounded-lg text-sm md:text-base transition-colors active:scale-95 font-semibold"
                >
                  Go
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Download Confirmation Dialog */}
      <PadhoDialog
        isOpen={showDownloadDialog}
        title="Download PDF?"
        message={`Do you want to download "${pdf.name}"?`}
        onConfirm={handleConfirmDownload}
        onCancel={() => setShowDownloadDialog(false)}
        confirmText="Download"
        cancelText="Cancel"
      />
    </div>
  )
}
