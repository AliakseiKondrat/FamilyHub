/**
 * Where each mascot's hat, glasses and scarf sit: the centre of the thing as fractions of the mascot box,
 * the size as a fraction of it, and a tilt for hats. Measured on Android's emoji (Noto); faces share one set,
 * animals drawn whole (side view, mostly facing left) get their own so a hat lands on the head, not in the air.
 */
export type Pt = [x: number, y: number, size: number, rot?: number]
export interface Anchors { top: Pt; eyes: Pt; neck: Pt }

const FACE: Anchors = { top: [0.5, 0.02, 0.5, -8], eyes: [0.5, 0.5, 0.42], neck: [0.5, 1.0, 0.34] }

export const ANCHORS: Record<string, Anchors> = {
  fox: { ...FACE, eyes: [0.5, 0.52, 0.42] }, cat: FACE, dog: { ...FACE, eyes: [0.5, 0.48, 0.42] }, bear: { ...FACE, eyes: [0.5, 0.48, 0.42] },
  panda: FACE, koala: { ...FACE, eyes: [0.5, 0.48, 0.42] }, lion: { ...FACE, top: [0.5, 0.0, 0.5, -8] },
  rabbit: { top: [0.5, 0.3, 0.32, -8], eyes: [0.5, 0.58, 0.36], neck: [0.5, 1.0, 0.3] },
  penguin: { top: [0.45, 0.02, 0.34, -8], eyes: [0.43, 0.22, 0.26], neck: [0.5, 0.42, 0.26] },
  hedgehog: { top: [0.2, 0.38, 0.28, -15], eyes: [0.16, 0.55, 0.2], neck: [0.28, 0.72, 0.22] },
  owl: { top: [0.5, 0.02, 0.42, -8], eyes: [0.5, 0.3, 0.36], neck: [0.5, 0.52, 0.3] },
  sloth: { top: [0.3, 0.27, 0.28, -8], eyes: [0.3, 0.42, 0.22], neck: [0.35, 0.58, 0.22] },
  turtle: { top: [0.16, 0.36, 0.26, -8], eyes: [0.15, 0.5, 0.2], neck: [0.25, 0.66, 0.2] },
  flamingo: { top: [0.22, 0.02, 0.24, -8], eyes: [0.2, 0.11, 0.16], neck: [0.3, 0.3, 0.18] },
  octopus: { top: [0.5, 0.04, 0.44, -8], eyes: [0.5, 0.4, 0.38], neck: [0.5, 0.62, 0.32] },
  unicorn: { top: [0.5, 0.12, 0.32, 10], eyes: [0.3, 0.42, 0.22], neck: [0.55, 0.88, 0.28] },
  whale: { top: [0.32, 0.42, 0.3, -8], eyes: [0.25, 0.62, 0.22], neck: [0.35, 0.8, 0.24] },
  dragon: { top: [0.58, 0.02, 0.3, 8], eyes: [0.6, 0.17, 0.2], neck: [0.5, 0.35, 0.22] },
  parrot: { top: [0.3, 0.04, 0.3, -8], eyes: [0.28, 0.22, 0.2], neck: [0.4, 0.38, 0.22] },
  camel: { top: [0.12, 0.12, 0.26, -8], eyes: [0.12, 0.25, 0.18], neck: [0.2, 0.42, 0.2] },
  kangaroo: { top: [0.14, 0.08, 0.26, -8], eyes: [0.14, 0.25, 0.18], neck: [0.25, 0.42, 0.2] },
  giraffe: { top: [0.24, 0.0, 0.26, -8], eyes: [0.24, 0.12, 0.18], neck: [0.33, 0.3, 0.2] },
}
export const anchorsOf = (mascot: string): Anchors => ANCHORS[mascot] ?? FACE
