// Authored, deterministic examples. Frames explain a fixed case, not arbitrary code execution.
export const frame = (code, cells, note, pointer = '') => ({ code, cells, note, pointer })
export const check = (question, choices, answer, why) => ({ question, choices, answer, why })
export const guide = (title, goal, paragraphs, traceTitle, frames, checkpoint, transfer, solution, transferCheck) =>
  ({ title, goal, paragraphs, trace: { title: traceTitle, frames }, checkpoint, transfer, solution, transferCheck })
