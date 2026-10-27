/**
 * Phase 3 round-trip tests: ABC → Score → ABC for the v1 subset.
 * Run: npm run test:roundtrip
 */
import { createJiti } from 'jiti';

const jiti = createJiti(import.meta.url);
const { parseAbc, scoresEqual } = await jiti.import('../src/serializer/abc-parser.ts');
const { writeAbc } = await jiti.import('../src/serializer/abc-writer.ts');
const { createEmptyScore } = await jiti.import('../src/model/score.ts');
const { ABC_DEFAULTS } = await jiti.import('../src/serializer/abc-defaults.ts');

let passed = 0;
let failed = 0;

/** Record a pass or fail for one round-trip check without stopping the rest of the script. */
function assert(condition, message) {
	if (!condition) {
		console.error(`FAIL: ${message}`);
		failed++;
		return;
	}
	console.log(`OK: ${message}`);
	passed++;
}

/** Parse ABC, write it back, and check the score is unchanged, used for the v1 notation subset. */
function roundTrip(label, abc) {
	const parsed = parseAbc(abc);
	assert(parsed.score !== null, `${label}: parse produced a score`);
	if (!parsed.score) {
		return parsed;
	}

	const written = writeAbc(parsed.score);
	const reparsed = parseAbc(written);
	assert(reparsed.score !== null, `${label}: re-parse after write`);
	if (!reparsed.score) {
		return parsed;
	}

	assert(
		scoresEqual(parsed.score, reparsed.score),
		`${label}: score round-trip (${written.replace(/\n/g, ' / ')})`,
	);
	return parsed;
}

// DESIGN example
roundTrip('design example', `X:1
M:4/4
L:1/4
K:C
CDEF|GABc|`);

// Durations
roundTrip('durations', `X:1
M:4/4
L:1/4
K:C
C4|C2|C|C/|`);

// Rests
roundTrip('rests', `X:1
M:4/4
L:1/4
K:C
z|z2|z4|z/|`);

// Accidentals
const accidentalParsed = roundTrip('accidentals', `X:1
M:4/4
L:1/4
K:C
^F|_B|=C|`);

if (accidentalParsed.score) {
	const events = accidentalParsed.score.staves[0]?.measures.flatMap((m) => m.events) ?? [];
	assert(events[0]?.kind === 'note' && events[0].pitches[0]?.accidental === 'sharp', 'accidentals: sharp');
	assert(events[1]?.kind === 'note' && events[1].pitches[0]?.accidental === 'flat', 'accidentals: flat');
	assert(events[2]?.kind === 'note' && events[2].pitches[0]?.accidental === 'natural', 'accidentals: natural');
}

// Default note duration = quarter
const empty = createEmptyScore();
assert(empty.defaultNoteDuration === 'quarter', 'empty score default duration is quarter');
assert(empty.defaultNoteDuration === ABC_DEFAULTS.defaultNoteDuration, 'empty score matches ABC_DEFAULTS');

const emptyWritten = writeAbc(empty);
assert(emptyWritten.includes('L:1/4'), 'writer emits L:1/4 for quarter default');

// Chords deferred (3.6)
const chordParsed = parseAbc(`X:1
M:4/4
L:1/4
K:C
[CEG]|`);
assert(chordParsed.score !== null, 'chord: still parses');
assert(
	chordParsed.warnings.some((w) => w.kind === 'chord'),
	'chord: emits chord warning',
);
if (chordParsed.score) {
	const note = chordParsed.score.staves[0]?.measures[0]?.events[0];
	assert(note?.kind === 'note' && note.pitches.length === 1, 'chord: single pitch only');
	assert(note?.kind === 'note' && note.pitches[0]?.step === 'C', 'chord: first pitch is C');
}

// Multi-staff deferred (3.6)
const multiParsed = parseAbc(`X:1
M:4/4
L:1/4
K:C
V:1 treble
CDEF|
V:2 bass
F,ED,|`);
assert(multiParsed.warnings.some((w) => w.kind === 'multi-staff'), 'multi-staff: emits warning');
if (multiParsed.score) {
	const body = writeAbc(multiParsed.score);
	assert(!body.includes('F,ED,'), 'multi-staff: second voice omitted');
	assert(body.includes('CDEF'), 'multi-staff: first voice kept');
}

// Key and time signatures
const headerParsed = parseAbc(`X:1
M:3/4
L:1/4
K:Am
A|`);
if (headerParsed.score) {
	assert(headerParsed.score.timeSignature === '3/4', 'time signature parsed');
	assert(headerParsed.score.keySignature === 'Am', 'key signature parsed');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
