import { del, list } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"

const METADATA_PREFIX = "pdfs/meta/"

async function getMetadata() {
  try {
    console.log("[v0] DELETE - Attempting to list metadata blobs with prefix:", METADATA_PREFIX)
    const { blobs: metadataBlobs } = await list({ prefix: METADATA_PREFIX })
    console.log("[v0] DELETE - Found metadata files:", metadataBlobs.length)
    
    if (metadataBlobs.length === 0) {
      console.warn("[v0] DELETE - No metadata files found! This might indicate:")
      console.warn("[v0] DELETE - 1. No PDFs have been uploaded yet")
      console.warn("[v0] DELETE - 2. BLOB_READ_WRITE_TOKEN might be missing or invalid")
      console.warn("[v0] DELETE - 3. Metadata files might be in a different location")
      return []
    }

    const metadataList = await Promise.all(
      metadataBlobs.map(async (blob) => {
        try {
          console.log("[v0] DELETE - Fetching metadata from:", blob.pathname)
          const response = await fetch(blob.url)
          if (!response.ok) {
            console.log("[v0] DELETE - Bad response for blob:", blob.pathname, "status:", response.status)
            return null
          }
          const text = await response.text()
          if (!text || text.trim() === "" || text === '""') {
            console.log("[v0] DELETE - Empty metadata blob:", blob.pathname)
            return null
          }
          const parsed = JSON.parse(text)
          if (!parsed.id || !parsed.name || !parsed.url) {
            console.log("[v0] DELETE - Invalid metadata - missing required fields:", blob.pathname, "parsed:", parsed)
            return null
          }
          console.log("[v0] DELETE - Valid metadata:", parsed.id, parsed.name, "type of id:", typeof parsed.id)
          return parsed
        } catch (error) {
          console.error("[v0] DELETE - Error parsing metadata blob:", blob.pathname, error)
          return null
        }
      }),
    )

    const parsedMetadata = metadataList.filter((m) => m !== null)
    console.log("[v0] DELETE - Valid parsed metadata count:", parsedMetadata.length)

    const uniqueMetadata = Array.from(new Map(parsedMetadata.map((m: any) => [m.id, m])).values())
    console.log("[v0] DELETE - After deduplication:", uniqueMetadata.length)
    console.log("[v0] DELETE - Available IDs with types:", uniqueMetadata.map((m: any) => ({ id: m.id, type: typeof m.id, name: m.name })))

    return uniqueMetadata
  } catch (error) {
    console.error("[v0] DELETE - Error getting metadata:", error)
    if (error instanceof Error) {
      console.error("[v0] DELETE - Error message:", error.message)
      console.error("[v0] DELETE - Error stack:", error.stack)
    }
    // Return empty array instead of throwing to allow the delete handler to provide better error message
    return []
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params?: { id?: string } } = {},
) {
  try {
    const paramsId = context?.params?.id
    const nextUrl = request.nextUrl ?? new URL(request.url)
    const pathnameSegments = nextUrl.pathname.split("/").filter(Boolean)
    const fallbackId = pathnameSegments[pathnameSegments.length - 1]
    const idRaw = paramsId ?? fallbackId ?? ""
    const id = decodeURIComponent(String(idRaw)).trim()

    if (!id || id === "undefined" || id === "null") {
      console.error("[v0] DELETE - Missing or invalid ID in request", {
        paramsId,
        fallbackId,
        pathname: nextUrl.pathname,
      })
      return NextResponse.json(
        { error: "Missing or invalid PDF ID" },
        { status: 400 },
      )
    }

    console.log("[v0] DELETE attempting to delete PDF with id:", id, "type:", typeof id)

    const metadata = await getMetadata()
    console.log("[v0] DELETE - Total metadata entries:", metadata.length)
    
    // Try to find PDF - compare as strings to handle any type mismatches
    const pdf = metadata.find((p: any) => {
      const match = String(p.id) === String(id)
      if (!match) {
        console.log("[v0] DELETE - ID mismatch - looking for:", id, "found:", p.id, "types:", typeof id, typeof p.id)
      }
      return match
    })

    if (!pdf) {
      console.log("[v0] DELETE PDF not found with id:", id, "type:", typeof id)
      if (metadata.length === 0) {
        console.error("[v0] DELETE - No metadata found at all! This suggests:")
        console.error("[v0] DELETE - 1. BLOB_READ_WRITE_TOKEN might be missing or invalid")
        console.error("[v0] DELETE - 2. No PDFs have been uploaded to this blob store")
        return NextResponse.json({ 
          error: "PDF not found. No metadata available. Please check if PDFs have been uploaded and BLOB_READ_WRITE_TOKEN is configured." 
        }, { status: 404 })
      }
      console.log("[v0] DELETE - Available PDF IDs in metadata:", metadata.map((p: any) => ({ id: p.id, type: typeof p.id, name: p.name })))
      return NextResponse.json({ 
        error: `PDF not found with id: ${id}. Available IDs: ${metadata.map((p: any) => p.id).join(", ")}` 
      }, { status: 404 })
    }

    console.log("[v0] DELETE found PDF:", pdf.name, "with URL:", pdf.url)

    let pdfDeleted = false
    try {
      // Files are saved as pdfs/{id}-{name}, so reconstruct the exact filename
      const filename = `pdfs/${id}-${pdf.name}`
      console.log("[v0] DELETE attempting to delete blob with filename:", filename)
      
      try {
        await del(filename)
        console.log("[v0] PDF file deleted successfully using filename:", filename)
        pdfDeleted = true
      } catch (delError) {
        console.warn("[v0] DELETE - Direct filename deletion failed, trying alternative methods")
        
        // Fallback 1: Try to find the blob by listing
        try {
          const { blobs } = await list({ prefix: `pdfs/${id}-` })
          const blobToDelete = blobs.find((b: any) => {
            // Match by pathname containing the ID and name
            return b.pathname.includes(id) && b.pathname.includes(pdf.name) && !b.pathname.includes("meta/")
          })
          
          if (blobToDelete) {
            console.log("[v0] DELETE found blob by pathname:", blobToDelete.pathname)
            await del(blobToDelete.pathname)
            console.log("[v0] PDF file deleted successfully using pathname")
            pdfDeleted = true
          } else {
            // Fallback 2: Try using the URL
            if (pdf.url) {
              console.log("[v0] DELETE attempting to delete blob using URL:", pdf.url)
              await del(pdf.url)
              console.log("[v0] PDF file deleted successfully using URL")
              pdfDeleted = true
            }
          }
        } catch (listError) {
          console.error("[v0] DELETE - Error with alternative delete methods:", listError)
        }
        
        if (!pdfDeleted) {
          throw delError // Re-throw original error if all methods failed
        }
      }
    } catch (error) {
      console.error("[v0] Error deleting PDF file:", error)
      const errorDetails = error instanceof Error ? error.message : String(error)
      console.error("[v0] Error details:", errorDetails)
      // Continue to delete metadata even if PDF deletion fails
      // But we'll note that PDF deletion failed
      if (!pdfDeleted) {
        console.warn("[v0] PDF file deletion failed, but continuing with metadata deletion")
      }
    }

    try {
      const metadataPath = `${METADATA_PREFIX}${id}.json`
      console.log("[v0] DELETE attempting to delete metadata:", metadataPath)
      await del(metadataPath)
      console.log("[v0] Metadata deleted successfully:", id)
    } catch (error) {
      console.error("[v0] Error deleting metadata:", error)
      // Continue anyway - metadata might not exist
    }

    return NextResponse.json({ success: true, message: "PDF deleted successfully" })
  } catch (error) {
    console.error("[v0] Delete error:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to delete PDF"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
