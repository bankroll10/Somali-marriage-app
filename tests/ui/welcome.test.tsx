// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import Welcome from '../../src/components/Welcome'
import Talking from '../../src/components/Talking'
import { familyScript } from '../../src/data/families'
import { mount, type Mounted } from '../support/render'

/**
 * The first screen (docs/DECISIONS.md Part 25, then release R3): a headline
 * that says what Niyyah is for, one door that says what the tap does, a way to
 * manage an earlier introduction request, and no promise the product cannot
 * keep. New introduction requests are closed and matching is not available, so
 * nothing here offers either. A promise about privacy is the one thing that
 * must not outrun the code (docs/PRIVACY.md): the eleven is sent to another
 * person on purpose, so neither "No one else sees it" nor "Private to you" is
 * true of the page as a whole.
 */

let screen: Mounted | undefined
afterEach(() => {
  screen?.unmount()
  screen = undefined
})

const props = () => ({
  onBegin: vi.fn(),
  onLooking: vi.fn(),
  onTalking: vi.fn(),
  onResume: vi.fn(),
  onEnter: vi.fn(),
  hasProgress: false,
  completed: false,
})

describe('Welcome', () => {
  it('names what Niyyah is for, says introductions are closed, and keeps the one door and the quieter paths', async () => {
    screen = await mount(<Welcome {...props()} />)
    const text = screen.text()
    expect(text).toMatch(/Think marriage through\./)
    expect(text).toMatch(/New introduction requests are closed, and matching is not available\./)
    // Nothing that promises the discontinued service, or a date.
    expect(text).not.toMatch(/Meet someone serious|founder-led|made by hand|founder speaks with you|Minneapolis|looking for someone serious|See how introductions work/i)
    expect(text).not.toMatch(/\b(soon|opens|launch|coming)\b/i)
    for (const name of [/I’m already talking to someone/, /Choose where to start/, 'Start where you are', /Manage an earlier introduction request/, /Bring your map back/]) {
      expect(screen.has(name), String(name)).toBe(true)
    }
    for (const gone of [/I’m looking for someone serious/, /See how introductions work/]) expect(screen.has(gone), String(gone)).toBe(false)
  })

  it('sends the door where it says, the map path where it says, and an earlier request to its screen', async () => {
    const p = props()
    screen = await mount(<Welcome {...p} />)
    await screen.press(/Manage an earlier introduction request/)
    expect(p.onLooking).toHaveBeenCalledTimes(1)
    await screen.press(/Choose where to start/)
    expect(p.onTalking).toHaveBeenCalledTimes(1)
    await screen.press('Start where you are')
    expect(p.onBegin).toHaveBeenCalledTimes(1)
  })

  it('offers resuming only to someone with progress, and Enter to someone finished', async () => {
    screen = await mount(<Welcome {...props()} />)
    expect(screen.has('Pick up where you left off')).toBe(false)
    screen.unmount()
    screen = await mount(<Welcome {...props()} hasProgress />)
    expect(screen.has('Pick up where you left off')).toBe(true)
    screen.unmount()
    screen = await mount(<Welcome {...props()} completed />)
    expect(screen.has(/^Enter Niyyah/)).toBe(true)
    // A returning member can still reach an earlier request.
    expect(screen.has(/Manage an earlier introduction request/)).toBe(true)
  })

  it('makes no completion-time claim and no blanket privacy claim', async () => {
    screen = await mount(<Welcome {...props()} />)
    const text = screen.text()
    expect(text).not.toMatch(/two minutes/i)
    expect(text).not.toMatch(/No one else sees it/i)
    expect(text).not.toMatch(/Private to you/i)
    expect(text).not.toMatch(/What’s in your way/)
    // What it says instead is scoped to what the code does.
    expect(text).toMatch(/stays on your phone unless you choose to send something, such as questions for the person you are talking to/)
    // The step count is on unless she turns it off (Trust, "Tell us which steps you reach"), so the page says it counts steps.
    expect(text).toMatch(/counts which steps people reach, in one word each and never in your words; you can turn that off under Your privacy/)
    expect(text).not.toMatch(/founder reads|your name for an introduction/)
  })
})

describe('Talking', () => {
  it('explains its three options without needing the product’s own terms first', async () => {
    const go = { onRead: vi.fn(), onBeforeYes: vi.fn(), onFamilies: vi.fn(), onBack: vi.fn() }
    screen = await mount(<Talking {...go} />)
    const text = screen.text()
    expect(text).not.toMatch(/introduction/i)
    expect(text).not.toMatch(/\bthe read\b|\bget a read\b|the eleven/i)
    await screen.press(/I can’t tell what they mean yet/)
    await screen.press(/We’re getting serious/)
    await screen.press(/The families are coming in/)
    expect(go.onRead).toHaveBeenCalledTimes(1)
    expect(go.onBeforeYes).toHaveBeenCalledTimes(1)
    expect(go.onFamilies).toHaveBeenCalledTimes(1)
  })
})

describe('Talking: the family-script invitation is true of the scripts that exist', () => {
  it('says the sentences are for your own family, for the other person and for when the families meet — and each has a script', async () => {
    const go = { onRead: vi.fn(), onBeforeYes: vi.fn(), onFamilies: vi.fn(), onBack: vi.fn() }
    screen = await mount(<Talking {...go} />)
    expect(screen.text()).toContain('Word-for-word sentences to say aloud — to your own family, to the other person, and for when the families meet.')
    // To her own family, to the other person, and for the two families meeting (src/data/families.ts).
    expect(familyScript('tell-wali-online', 'woman')).toBeDefined()
    expect(familyScript('send-his-people', 'woman')).toBeDefined()
    expect(familyScript('open-mahr-and-living', 'woman')).toBeDefined()
    expect(familyScript('families-meet', 'woman')).toBeDefined()
  })
})
