/**
 * Who may vouch, and how she sees it.
 *
 * "Vouched by family · your brother." The relationship is shown from her side,
 * because that is the sentence that carries weight in the room — not a badge,
 * a person she can name.
 *
 * The form's labels are neutral on purpose. The family member's screen opens
 * from a token that resolves to a code and nothing else — it cannot know
 * whether it was a daughter or a son who sent it — and it used to say "Her
 * father" to every father, including a man's. docs/NORTHSTAR.md.
 */
export interface Relationship {
  id: string
  /** As the family member sees it on the form. */
  label: string
  /** As she and, one day, a member sees it. */
  yours: string
}

export const RELATIONSHIPS: Relationship[] = [
  { id: 'father', label: 'Father', yours: 'your father' },
  { id: 'brother', label: 'Brother', yours: 'your brother' },
  { id: 'uncle', label: 'Uncle', yours: 'your uncle' },
  { id: 'mother', label: 'Mother', yours: 'your mother' },
  { id: 'aunt', label: 'Aunt', yours: 'your aunt' },
  { id: 'other', label: 'Other family', yours: 'your family' },
]

export function relationshipLabel(id: string): string {
  return RELATIONSHIPS.find((x) => x.id === id)?.yours ?? 'your family'
}

/**
 * The options on the family member's form. Neutral, so they read right whoever
 * sent the link; the parameter is kept so a caller that does know can still
 * pass it without a change here.
 */
export function relationshipOptions(_memberGender: 'woman' | 'man' = 'woman'): Relationship[] {
  return RELATIONSHIPS
}
