"use client"

import type React from "react"

import { Upload, AlertCircle, CheckCircle, LogOut } from "lucide-react"
import { useState } from "react"

interface AdminPanelProps {
  onUploadSuccess: () => void
  onLogout: () => void
}

export default function AdminPanel({ onUploadSuccess, onLogout }: AdminPanelProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileInput, setFileInput] = useState<HTMLInputElement | null>(null)

  const handleFile = (file: File) => {
    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file")
      setSuccess(false)
      return
    }

    const MAX_FILE_SIZE = 20 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      setError("size must less than 20MB, compress it and upload the same here.")
      setSuccess(false)
      return
    }

    setError("")
    setSuccess(false)
    setSelectedFile(file)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      handleFile(files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files[0]) {
      handleFile(files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedFile) {
      setError("Please select a PDF file first")
      setSuccess(false)
      return
    }

    setError("")
    setSuccess(false)
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("name", selectedFile.name)

      const res = await fetch("/api/pdfs", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Upload failed")
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)

      setSelectedFile(null)
      if (fileInput) {
        fileInput.value = ""
      }
      onUploadSuccess()
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to upload PDF. Please try again."
      setError(errorMsg)
      console.error("[v0] Upload error:", err)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-4">Admin Panel</h2>
          <p className="text-muted-foreground">Upload PDF files to make them available to all users</p>
        </div>

        {/* Upload Area */}
        <label
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`block border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragActive ? "border-primary bg-primary bg-opacity-5" : "hover:border-primary"
          } ${uploading ? "opacity-50 pointer-events-none" : ""}`}
          style={{
            borderColor: dragActive ? "var(--primary)" : "var(--border)",
          }}
        >
          <Upload className="w-12 h-12 mx-auto mb-3 text-primary" />
          <p className="font-semibold text-foreground mb-1">
            {uploading
              ? "Uploading..."
              : selectedFile
                ? `Selected: ${selectedFile.name}`
                : "Drop your PDF here or click to upload"}
          </p>
          <p className="text-sm text-muted-foreground">Maximum file size: 20MB</p>
          <input
            ref={setFileInput}
            type="file"
            accept="application/pdf"
            onChange={handleChange}
            disabled={uploading}
            className="hidden"
          />
        </label>

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-500 text-green-700 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-semibold">PDF uploaded successfully</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-accent text-accent rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={uploading || !selectedFile}
          className="w-full bg-primary hover:bg-primary-light text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? "Uploading..." : "Upload PDF"}
        </button>

        {/* Info Box */}
        <div className="bg-primary-light bg-opacity-10 border border-primary-light rounded-lg p-4">
          <p className="text-sm text-foreground">
            <span className="font-semibold">Tip:</span> You can drag and drop a PDF file directly onto the upload area, or
            click to browse your device. Then click "Upload PDF" to submit.
          </p>
        </div>
      </form>

      {/* Logout Button */}
      <button
        onClick={onLogout}
        className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <LogOut className="w-5 h-5" />
        Logout
      </button>
    </div>
  )
}
