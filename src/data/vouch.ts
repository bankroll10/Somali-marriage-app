/**
 * Who may vouch, and how she sees it.
 *
 * "Vouched by family · your brother." The relationship is shown from her side,
 * because that is the sentence that carries weight in the room — not a badge,
 * a person she can name.
 */
export interface Relationship {
  id: string
  /** As the family member sees it on the form. */
  label: string
  /** As she and, one day, a member sees it. */
  yours: string
}

export const RELATIONSHIPS: Relationship[] = [
  { id: 'father', label: 'Her father', yours: 'your father' },
  { id: 'brother', label: 'Her brother', yours: 'your brother' },
  { id: 'uncle', label: 'Her uncle', yours: 'your uncle' },
  { id: 'mother', label: 'Her mother', yours: 'your mother' },
  { id: 'aunt', label: 'Her aunt', yours: 'your aunt' },
  { id: 'other', label: 'Other family', yours: 'your family' },
]

export function relationshipLabel(id: string): string {
  return RELATIONSHIPS.find((x) => x.id === id)?.yours ?? 'your family'
}

/** The form's labels flip when the member being vouched for is a man. */
export function relationshipOptions(memberGender: 'woman' | 'man' = 'woman'): Relationship[] {
  if (memberGender === 'woman') return RELATIONSHIPS
  return RELATIONSHIPS.map((r) => ({ ...r, label: r.label.replace(/^Her /, 'His ') }))
}
