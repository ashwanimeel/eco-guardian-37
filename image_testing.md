# Image Integration Testing Playbook

## Rules
- Always use base64-encoded images
- Accepted formats: JPEG, PNG, WEBP only
- No SVG / BMP / HEIC / GIF
- No blank or uniform-variance images
- Must contain real visual features (text, edges, textures)
- Re-detect MIME after any transcode
- Extract first frame from animated formats
- Resize oversized images before upload

## EcoTrack AI Bill Scanner endpoint
- POST /api/scanner/bill
- multipart/form-data: file=<jpeg|png|webp>
- Auth required (Bearer or cookie session)
- Returns: {extracted: {kwh, period, amount, provider}, emissions: {...}, entry_saved: bool}
