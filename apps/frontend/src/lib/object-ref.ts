/**
 * Opaque `objectRef` token — base64url encoding of `(objectType, objectId)`.
 * Mirror of the BE helper in `apps/backend/src/common/object-ref/`. Same
 * format on both sides so a token issued by the FE round-trips losslessly
 * if echoed by the BE (and vice versa).
 *
 * Tenant `organizationId` is intentionally NOT part of the token — the
 * BE always derives it from the JWT.
 */

const SEP = ":";

export interface ObjectRef {
  objectType: string;
  objectId: string;
}

function base64urlEncode(input: string): string {
  const b64 =
    typeof window === "undefined"
      ? Buffer.from(input, "utf8").toString("base64")
      : btoa(unescape(encodeURIComponent(input)));
  return b64.replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64urlDecode(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  if (typeof window === "undefined") {
    return Buffer.from(padded, "base64").toString("utf8");
  }
  return decodeURIComponent(escape(atob(padded)));
}

export function encodeObjectRef(ref: ObjectRef): string {
  if (!ref.objectType || !ref.objectId) {
    throw new Error("encodeObjectRef: objectType and objectId are required");
  }
  if (ref.objectType.includes(SEP)) {
    throw new Error(
      `encodeObjectRef: objectType "${ref.objectType}" must not contain "${SEP}"`,
    );
  }
  return base64urlEncode(`${ref.objectType}${SEP}${ref.objectId}`);
}

export function decodeObjectRef(token: string): ObjectRef {
  const decoded = base64urlDecode(token);
  const idx = decoded.indexOf(SEP);
  if (idx <= 0 || idx === decoded.length - 1) {
    throw new Error(`decodeObjectRef: malformed token "${token}"`);
  }
  return {
    objectType: decoded.slice(0, idx),
    objectId: decoded.slice(idx + 1),
  };
}
