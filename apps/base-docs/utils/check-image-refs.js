import fs from 'fs/promises'
import path from 'path'

// Utility function to extract image references from markdown
function extractImageReferences({ markdown }) {
  // Markdown image regex: ![alt text](image_url)
  const imageRegex = /!\[.*?\]\((.*?)\)/g
  const matches = []
  let match

  while (match = imageRegex.exec(markdown)) matches.push(match[1])
  return matches
}

// Check if remote URL is valid
async function isRemotePathValid({ url }) {
  try {
    const response = await fetch(url, { method: 'HEAD' })
    if (!response.ok) return false
    return true
  } catch {
    return false
  }
}

// Check if local file path exists
async function isLocalPathValid({ filePath }) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

// Main function to find broken references
export function findBrokenImageReferences({ markdownPath }) {
  return (async () => {
    let markdownContent
    try {
      markdownContent = await fs.readFile(markdownPath, 'utf8')
    } catch {
      throw new Error(`Could not read file: ${markdownPath}`)
    }

    const references = extractImageReferences({ markdown: markdownContent })
    if (!references.length) return { status: 'ok', broken: [] }

    const broken = []
    for (const ref of references) {
      if (ref.startsWith('http://') || ref.startsWith('https://')) {
        const valid = await isRemotePathValid({ url: ref })
        if (!valid) broken.push(ref)
      } else {
        // Resolve relative to current markdown path
        const dir = path.dirname(markdownPath)
        const resolvedPath = path.join(dir, ref)
        const valid = await isLocalPathValid({ filePath: resolvedPath })
        if (!valid) broken.push(ref)
      }
    }

    return { status: broken.length ? 'error' : 'ok', broken }
  })()
} 