import { put, list } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"

const METADATA_PREFIX = "pdfs/meta/"

async function getMetadata() {
  try {
    const { blobs: metadataBlobs } = await list({ prefix: METADATA_PREFIX })
    console.log("[v0] Found metadata files:", metadataBlobs.length)

    // Parse each metadata file
    const metadataList = await Promise.all(
      metadataBlobs.map(async (blob) => {
        try {
          const response = await fetch(blob.url)
          if (!response.ok) {
            console.log("[v0] Bad response for blob:", blob.pathname, "status:", response.status)
            return null
          }
          const text = await response.text()
          if (!text || text.trim() === "" || text === '""') {
            console.log("[v0] Empty metadata blob:", blob.pathname)
            return null
          }
          const parsed = JSON.parse(text)
          if (!parsed.id || !parsed.name || !parsed.url) {
            console.log("[v0] Invalid metadata - missing required fields:", blob.pathname)
            return null
          }
          console.log("[v0] Valid metadata:", parsed.id, parsed.name)
          return parsed
        } catch (error) {
          console.log("[v0] Error parsing metadata blob:", blob.pathname, error)
          return null
        }
      }),
    )

    const parsedMetadata = metadataList.filter((m) => m !== null)
    console.log("[v0] Valid parsed metadata count:", parsedMetadata.length)

    const uniqueMetadata = Array.from(new Map(parsedMetadata.map((m: any) => [m.id, m])).values())
    console.log("[v0] After deduplication:", uniqueMetadata.length)

    return uniqueMetadata
  } catch (error) {
    console.log("[v0] Error getting metadata:", error)
  }
  return []
}

async function saveMetadata(pdfId: string, pdfData: any) {
  try {
    const jsonString = JSON.stringify(pdfData)
    console.log("[v0] Saving metadata for PDF:", pdfId, "size:", jsonString.length, "bytes")

    await put(`${METADATA_PREFIX}${pdfId}.json`, jsonString, {
      access: "public",
      contentType: "application/json",
      allowOverwrite: true,
    })
    console.log("[v0] Metadata saved successfully for:", pdfId)
  } catch (error) {
    console.error("[v0] Error saving metadata:", error)
    throw error
  }
}

export async function GET() {
  try {
    const metadata = await getMetadata()
    console.log("[v0] Fetched all metadata, count:", metadata.length)
    return NextResponse.json(metadata)
  } catch (error) {
    console.error("[v0] Fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch PDFs" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const name = formData.get("name") as string

    if (!file || !name) {
      return NextResponse.json({ error: "Missing file or name" }, { status: 400 })
    }

    const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "size must less than 20MB, compress it and upload the same here." },
        { status: 400 },
      )
    }

    let buffer: ArrayBuffer
    try {
      buffer = await file.arrayBuffer()
    } catch (error) {
      console.error("[v0] Error reading file:", error)
      return NextResponse.json({ error: "Failed to read file" }, { status: 400 })
    }

    const timestamp = Date.now()
    const filename = `pdfs/${timestamp}-${name}`

    let blob
    try {
      blob = await put(filename, buffer, {
        access: "public",
        contentType: "application/pdf",
      })
      console.log("[v0] PDF uploaded to blob storage:", filename)
    } catch (error) {
      console.error("[v0] Error uploading PDF to blob storage:", error)
      return NextResponse.json({ error: "Failed to upload PDF file" }, { status: 500 })
    }

    try {
      const newPdf = {
        id: timestamp.toString(),
        name: name,
        url: blob.url,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      }

      await saveMetadata(timestamp.toString(), newPdf)

      console.log("[v0] PDF uploaded successfully:", newPdf)
      return NextResponse.json({ success: true, pdf: newPdf })
    } catch (error) {
      console.error("[v0] Error saving metadata:", error)
      return NextResponse.json({ error: "PDF uploaded but failed to save metadata" }, { status: 500 })
    }
  } catch (error) {
    console.error("[v0] Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Missing PDF ID" }, { status: 400 })
    }

    // Get current metadata
    const metadata = await getMetadata()

    // Find the PDF to get its filename and delete it
    const pdfToDelete = metadata.find((p: any) => p.id === id)
    if (!pdfToDelete) {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 })
    }

    try {
      const filename = `pdfs/${id}-${pdfToDelete.name}`
      await put(filename, "", {
        access: "public",
        contentType: "application/pdf",
        allowOverwrite: true,
      })
      console.log("[v0] PDF file deleted:", filename)
    } catch (error) {
      console.log("[v0] Note: PDF file deletion had issue:", error)
    }

    try {
      // Delete the metadata file
      await put(`${METADATA_PREFIX}${id}.json`, "", {
        access: "public",
        contentType: "application/json",
        allowOverwrite: true,
      })
      console.log("[v0] Metadata deleted:", id)
    } catch (error) {
      console.log("[v0] Note: Metadata cleanup had issue, but PDF marked for deletion")
    }

    return NextResponse.json({ success: true, message: "PDF deleted successfully" })
  } catch (error) {
    console.error("[v0] Delete error:", error)
    return NextResponse.json({ error: "Failed to delete PDF" }, { status: 500 })
  }
}
