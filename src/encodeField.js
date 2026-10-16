// Hostinger's firewall in front of the API rejects (403, no CORS headers →
// "Failed to fetch") any request body carrying rich-text HTML like <img src>.
// Rich-text fields are therefore sent base64-encoded as "<name>__b64"; the
// API's decodeEncodedFields middleware restores them under <name>.
export function toBase64(text) {
  const bytes = new TextEncoder().encode(String(text ?? ""));
  let binary = "";
  // Chunked: String.fromCharCode(...bytes) overflows the stack on long articles.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export function appendEncoded(formData, name, value) {
  formData.append(`${name}__b64`, toBase64(value));
}
