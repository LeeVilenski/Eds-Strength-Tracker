import { summariseSets } from "./game";

const BLOCK_START = "--- Strength Tracker (auto) ---";
const BLOCK_END = "--- End Strength Tracker ---";

// Build the auto-generated exercise breakdown block for a session's notes,
// or null if there's nothing worth writing back to Strava.
export function buildExerciseBlock(notes, allExercises) {
  const lines = [];
  for (const [exId, value] of Object.entries(notes?.exercises || {})) {
    const summary = summariseSets(value);
    if (!summary) continue;
    const ex = allExercises.find(e => e.id === exId);
    lines.push(`${ex?.label || exId}: ${summary}`);
  }
  if (lines.length === 0) return null;
  return [BLOCK_START, ...lines, BLOCK_END].join("\n");
}

// Replace any previously-written auto-generated block in `description` with
// `newBlock`, preserving the rest of the description. If `newBlock` is null,
// the block is simply removed.
export function mergeDescription(description, newBlock) {
  const escaped = [BLOCK_START, BLOCK_END].map(s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const blockPattern = new RegExp(`\\n*${escaped[0]}[\\s\\S]*?${escaped[1]}\\n*`, "g");
  const stripped = (description || "").replace(blockPattern, "").trim();
  if (!newBlock) return stripped;
  return stripped ? `${stripped}\n\n${newBlock}` : newBlock;
}
