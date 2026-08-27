let seq = 0

/** Unique-enough id for in-session entities (messages, etc.). */
export function nextId(prefix = 'id'): string {
  seq += 1
  return `${prefix}-${Date.now().toString(36)}-${seq.toString(36)}`
}
