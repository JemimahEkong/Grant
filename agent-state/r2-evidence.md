# R2 private storage evidence

Status: real upload and presigned download verified. The fixture was removed after the proof.

- Bucket: `grant-private`
- Private object: `licenses/lic_9bcb703d28d7422da8f201403ef0061e/r2-proof.pdf`
- Bytes: 217
- SHA-256: `94a9b38b024ec6a505967e945686140111c16c6755aac8a8d4d13dde58761c16`
- Local owner download: 200, bytes and hash matched
- Local unauthenticated request: 401
- Local non-owner request: 404
- Production owner download: 200, bytes and hash matched
- Production unauthenticated request: 401
- Public object URL used: no
- Signed URL published in evidence: no

The production request used the owner session and the entitlement-checked download route. The route issued a short-lived presigned GET URL only after the purchase, license, and artifact checks. The test fixture is an entitlement fixture, not a product payment.

Evidence JSON: `agent-state/r2-evidence.json`.
