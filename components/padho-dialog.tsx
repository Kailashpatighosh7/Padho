"use client"
import { X } from "lucide-react"

interface PadhoDialogProps {
  isOpen: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmText?: string
  cancelText?: string
  isDangerous?: boolean
}

export default function PadhoDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Yes",
  cancelText = "No",
  isDangerous = false,
}: PadhoDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-sm w-full mx-4">
        {/* Header */}
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Padho says</h2>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <h3 className="font-semibold text-foreground mb-2">{title}</h3>
          <p className="text-muted-foreground text-sm">{message}</p>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-foreground bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-white transition-colors ${
              isDangerous ? "bg-red-500 hover:bg-red-600" : "bg-primary hover:bg-primary-dark"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
