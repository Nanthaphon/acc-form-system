/** Hands bytes built in the browser to the person as a download. */
export function saveFile(bytes: Uint8Array, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  // Revoked a moment later: revoking at once can cancel the download itself.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
