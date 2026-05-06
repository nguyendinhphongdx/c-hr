/**
 * Opaque token encoding `(objectType, objectId)` pairs as a single
 * base64url string. Used at the API boundary so a single `objectRef`
 * prop / query param replaces two fields. Storage stays as separate
 * columns — see ADR notes in F6 plan and the polymorphic comment +
 * activity tables. Tenant `organizationId` is intentionally NOT in the
 * token: it always derives from `ctx.requireOrg()` so tokens can't
 * smuggle a different org.
 *
 * Format: `base64url(<objectType>:<objectId>)`.
 */

const SEP = ':';

export interface ObjectRef {
  objectType: string;
  objectId: string;
}

function base64urlEncode(input: string): string {
  return Buffer.from(input, 'utf8')
    .toString('base64')
    .replace(/=+$/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64urlDecode(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(padded, 'base64').toString('utf8');
}

export function encodeObjectRef(ref: ObjectRef): string {
  if (!ref.objectType || !ref.objectId) {
    throw new Error('encodeObjectRef: objectType and objectId are required');
  }
  if (ref.objectType.includes(SEP)) {
    throw new Error(`encodeObjectRef: objectType "${ref.objectType}" must not contain "${SEP}"`);
  }
  return base64urlEncode(`${ref.objectType}${SEP}${ref.objectId}`);
}

export function decodeObjectRef(token: string): ObjectRef {
  const decoded = base64urlDecode(token);
  const idx = decoded.indexOf(SEP);
  if (idx <= 0 || idx === decoded.length - 1) {
    throw new Error(`decodeObjectRef: malformed token "${token}"`);
  }
  return { objectType: decoded.slice(0, idx), objectId: decoded.slice(idx + 1) };
}
