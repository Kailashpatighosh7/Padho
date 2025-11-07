import { list } from "@vercel/blob"
import type { NextRequest } from "next/server"

const METADATA_KEY_PREFIX = "pdfs/meta/"

async function getMetadata() {
  try {
    const { blobs } = await list({ prefix: METADATA_KEY_PREFIX })

    const metadata: any[] = []
    for (const blob of blobs) {
      if (blob.pathname.endsWith(".json")) {
        const response = await fetch(blob.url)
        if (response.ok) {
          const data = await response.json()
          if (data.id && data.name && data.url) {
            metadata.push(data)
          }
        }
      }
    }

    return metadata
  } catch (error) {
    console.log("[v0] Download - Error fetching metadata:", error)
  }
  return []
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    const metadata = await getMetadata()
    console.log("[v0] Download - fetched metadata:", metadata)

    const pdf = metadata.find((p: any) => p.id === id)

    if (!pdf) {
      console.log("[v0] Download - PDF not found with id:", id)
      return new Response("PDF not found", { status: 404 })
    }

    // Fetch the PDF file from Blob
    const fileRes = await fetch(pdf.url)
    if (!fileRes.ok) {
      return new Response("Failed to download PDF", { status: 500 })
    }

    const buffer = await fileRes.arrayBuffer()

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${pdf.name}"`,
        "Content-Length": buffer.byteLength.toString(),
      },
    })
  } catch (error) {
    console.log("[v0] Download error:", error)
    return new Response("Download failed", { status: 500 })
  }
}
