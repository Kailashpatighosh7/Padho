"use client"

import { Download, Trash2, FileText, Eye } from "lucide-react"
import { useState } from "react"
import PadhoDialog from "./padho-dialog"

interface PDF {
  id: string
  name: string
  url: string
  size: number
  uploadedAt: string
}

interface PDFListProps {
  pdfs: PDF[]
  onDelete: () => void
  isAdmin?: boolean
}

export default function PDFList({ pdfs, onDelete, isAdmin = false }: PDFListProps) {
  const [deleting, setDeleting] = useState<string | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; id: string }>({
    isOpen: false,
    id: "",
  })
  const [downloadDialog, setDownloadDialog] = useState<{ isOpen: boolean; pdf: PDF | null }>({
    isOpen: false,
    pdf: null,
  })

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const handleDelete = async (id: string) => {
    // Validate ID before proceeding - check for all possible invalid states
    const idValue = String(id || "").trim()
    if (!id || id === undefined || id === null || idValue === "" || idValue === "undefined" || idValue === "null") {
      console.error("Cannot delete PDF: Invalid or missing ID", { id, type: typeof id, idValue })
      alert("Error: Cannot delete PDF. Invalid ID provided.")
      setDeleteDialog({ isOpen: false, id: "" })
      return
    }

    console.log("Attempting to delete PDF with ID:", idValue, "type:", typeof id)
    setDeleting(idValue)
    try {
      const res = await fetch(`/api/pdfs/${idValue}`, {
        method: "DELETE",
      })
      
      if (res.ok) {
        onDelete()
      } else {
        // Try to get the response text first
        const responseText = await res.text()
        console.error("Delete failed - Status:", res.status, "Response:", responseText)
        
        let errorMessage = "Failed to delete PDF"
        try {
          const errorData = JSON.parse(responseText)
          errorMessage = errorData.error || errorData.message || errorMessage
        } catch {
          // If not JSON, use the text or status
          errorMessage = responseText || `Server returned status ${res.status}`
        }
        
        alert(`Failed to delete PDF: ${errorMessage}`)
      }
    } catch (error) {
      console.error("Failed to delete PDF:", error)
      alert(`Error deleting PDF: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setDeleting(null)
      setDeleteDialog({ isOpen: false, id: "" })
    }
  }

  const handleDownload = async (pdf: PDF) => {
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
      setDownloadDialog({ isOpen: false, pdf: null })
    } catch (error) {
      console.error("[v0] Download error:", error)
      alert("Failed to download PDF")
    }
  }

  const handleOpen = (pdf: PDF) => {
    window.location.href = `/viewer/${pdf.id}`
  }

  return (
    <>
      <div className="space-y-3">
        {pdfs
          .filter((pdf) => pdf && pdf.id && pdf.id !== undefined && pdf.id !== null && String(pdf.id).trim() !== "")
          .map((pdf) => {
            // Ensure ID is a valid string
            const pdfId = String(pdf.id).trim()
            if (!pdfId || pdfId === "undefined" || pdfId === "null") {
              console.warn("Skipping PDF with invalid ID:", pdf)
              return null
            }
            return (
          <div
            key={pdfId}
            className="bg-white border rounded-lg p-4 flex items-center justify-between hover:shadow-md transition-shadow"
            style={{ borderColor: "#e2e8f0" }}
          >
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="bg-primary-light bg-opacity-10 p-3 rounded-lg flex-shrink-0">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-foreground truncate">{pdf.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(pdf.size)} • {formatDate(pdf.uploadedAt)}
                </p>
              </div>
            </div>

            {isAdmin && (
              <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                <button
                  onClick={() => handleOpen(pdf)}
                  className="bg-primary hover:bg-primary-light text-white p-2 rounded-lg transition-colors"
                  title="View PDF"
                >
                  <Eye className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setDownloadDialog({ isOpen: true, pdf })}
                  className="bg-primary hover:bg-primary-light text-white p-2 rounded-lg transition-colors"
                  title="Download PDF"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    const pdfId = pdf?.id
                    const idValue = pdfId ? String(pdfId).trim() : ""
                    if (!pdfId || pdfId === undefined || pdfId === null || idValue === "" || idValue === "undefined" || idValue === "null") {
                      console.error("Cannot delete PDF: Invalid ID", { pdf, id: pdfId, type: typeof pdfId, idValue })
                      alert("Error: Cannot delete PDF. Invalid ID.")
                      return
                    }
                    console.log("Opening delete dialog for PDF:", pdf.name, "with ID:", idValue)
                    setDeleteDialog({ isOpen: true, id: idValue })
                  }}
                  disabled={deleting === pdf.id || !pdf?.id || pdf.id === undefined || pdf.id === null}
                  className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                  title="Delete PDF"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            )}

            {!isAdmin && (
              <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                <button
                  onClick={() => handleOpen(pdf)}
                  className="bg-primary hover:bg-primary-light text-white p-2 rounded-lg transition-colors"
                  title="View PDF"
                >
                  <Eye className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setDownloadDialog({ isOpen: true, pdf })}
                  className="bg-primary hover:bg-primary-light text-white p-2 rounded-lg transition-colors"
                  title="Download PDF"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
            )
          })
          .filter(Boolean)}
      </div>

      <PadhoDialog
        isOpen={(() => {
          const dialogId = deleteDialog.id
          const idValue = dialogId ? String(dialogId).trim() : ""
          return Boolean(
            deleteDialog.isOpen &&
            dialogId &&
            dialogId !== undefined &&
            dialogId !== null &&
            idValue !== "" &&
            idValue !== "undefined" &&
            idValue !== "null"
          )
        })()}
        title="Delete PDF"
        message="Are you sure you want to delete this PDF? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous={true}
        onConfirm={() => {
          const dialogId = deleteDialog.id
          const idValue = dialogId ? String(dialogId).trim() : ""
          if (dialogId && dialogId !== undefined && dialogId !== null && idValue !== "" && idValue !== "undefined" && idValue !== "null") {
            console.log("Confirming delete for ID:", idValue)
            handleDelete(idValue)
          } else {
            console.error("Cannot delete: Invalid ID in dialog state", { deleteDialog, dialogId, type: typeof dialogId, idValue })
            alert("Error: Cannot delete PDF. Invalid ID.")
            setDeleteDialog({ isOpen: false, id: "" })
          }
        }}
        onCancel={() => setDeleteDialog({ isOpen: false, id: "" })}
      />

      <PadhoDialog
        isOpen={downloadDialog.isOpen}
        title="Download PDF"
        message={`Do you want to download "${downloadDialog.pdf?.name}"?`}
        confirmText="Download"
        cancelText="Cancel"
        isDangerous={false}
        onConfirm={() => downloadDialog.pdf && handleDownload(downloadDialog.pdf)}
        onCancel={() => setDownloadDialog({ isOpen: false, pdf: null })}
      />
    </>
  )
}
