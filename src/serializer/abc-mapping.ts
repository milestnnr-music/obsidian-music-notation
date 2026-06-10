import type { Accidental, NoteDuration, Pitch, PitchStep } from '../model/types';

const DURATION_RATIOS: Record<NoteDuration, number> = {
	whole: 4,
	half: 2,
	quarter: 1,
	eighth: 0.5,
};

const ABC_STEPS = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G']);

/** Map model default note duration to ABC `L:` field value. */
export function defaultDurationToAbcL(duration: NoteDuration): string {
	switch (duration) {
		case 'whole':
			return '1';
		case 'half':
			return '1/2';
		case 'quarter':
			return '1/4';
		case 'eighth':
			return '1/8';
	}
}

/** Parse ABC `L:` field into a v1 note duration, defaulting to quarter. */
export function abcLToDefaultDuration(value: string): NoteDuration {
	const normalized = value.trim();
	switch (normalized) {
		case '1':
			return 'whole';
		case '1/2':
			return 'half';
		case '1/8':
			return 'eighth';
		case '1/4':
		default:
			return 'quarter';
	}
}

/** Duration suffix after a note/rest letter relative to the score default. */
export function durationToAbcSuffix(
	duration: NoteDuration,
	defaultDuration: NoteDuration,
): string {
	const ratio = DURATION_RATIOS[duration] / DURATION_RATIOS[defaultDuration];
	if (ratio === 1) {
		return '';
	}
	if (ratio === 0.5) {
		return '/';
	}
	if (Number.isInteger(ratio)) {
		return String(ratio);
	}
	return '';
}

/** Map ABC duration suffix (after note letter) to a v1 note duration. */
export function abcSuffixToDuration(
	suffix: string,
	defaultDuration: NoteDuration,
): NoteDuration | null {
	const defaultRatio = DURATION_RATIOS[defaultDuration];
	let ratio = 1;

	if (!suffix) {
		ratio = 1;
	} else if (suffix.startsWith('/')) {
		const divisor = suffix.length === 1 ? 2 : Number.parseInt(suffix.slice(1), 10);
		if (!Number.isFinite(divisor) || divisor <= 0) {
			return null;
		}
		ratio = 1 / divisor;
	} else {
		const multiplier = Number.parseInt(suffix, 10);
		if (!Number.isFinite(multiplier) || multiplier <= 0) {
			return null;
		}
		ratio = multiplier;
	}

	const absolute = defaultRatio * ratio;
	for (const [duration, value] of Object.entries(DURATION_RATIOS) as [NoteDuration, number][]) {
		if (value === absolute) {
			return duration;
		}
	}
	return null;
}

export function isAbcPitchLetter(char: string): boolean {
	return ABC_STEPS.has(char.toUpperCase());
}

/** Serialize a single pitch to ABC (accidental + letter + octave modifiers). */
export function pitchToAbc(pitch: Pitch): string {
	let accidentalPrefix = '';
	if (pitch.accidental === 'sharp') {
		accidentalPrefix = '^';
	} else if (pitch.accidental === 'flat') {
		accidentalPrefix = '_';
	} else if (pitch.accidental === 'natural') {
		accidentalPrefix = '=';
	}

	const step = pitch.step.toUpperCase();
	let letter: string;
	let baseOctave: number;

	if (pitch.octave >= 4) {
		letter = step.toLowerCase();
		baseOctave = 4;
	} else {
		letter = step;
		baseOctave = 3;
	}

	const shift = pitch.octave - baseOctave;
	let octaveSuffix = '';
	if (shift > 0) {
		octaveSuffix = "'".repeat(shift);
	} else if (shift < 0) {
		octaveSuffix = ','.repeat(-shift);
	}

	return `${accidentalPrefix}${letter}${octaveSuffix}`;
}

export interface ParsedAbcPitch {
	readonly pitch: Pitch;
	readonly consumed: number;
}

/** Parse pitch from ABC body at `index`; returns null when not a note. */
export function parseAbcPitch(source: string, index: number): ParsedAbcPitch | null {
	let i = index;
	let accidental: Accidental | undefined;

	if (source[i] === '^') {
		accidental = 'sharp';
		i++;
	} else if (source[i] === '_') {
		accidental = 'flat';
		i++;
	} else if (source[i] === '=') {
		accidental = 'natural';
		i++;
	}

	const letter = source[i];
	if (!letter || !isAbcPitchLetter(letter)) {
		return null;
	}

	const step = letter.toUpperCase() as PitchStep;
	const isLower = letter === letter.toLowerCase();
	let octave = isLower ? 4 : 3;
	i++;

	while (source[i] === ',') {
		octave--;
		i++;
	}
	while (source[i] === "'") {
		octave++;
		i++;
	}

	const pitch: Pitch = accidental
		? { step, octave, accidental }
		: { step, octave };

	return { pitch, consumed: i - index };
}

/** Parse duration suffix immediately following a note or rest. */
export function parseAbcDurationSuffix(source: string, index: number): {
	readonly suffix: string;
	readonly consumed: number;
} {
	let i = index;
	if (source[i] === '/') {
		i++;
		while (source[i] === '/') {
			i++;
		}
		const digits = readDigits(source, i);
		if (digits) {
			return { suffix: source.slice(index, i + digits.length), consumed: i + digits.length - index };
		}
		return { suffix: source.slice(index, i), consumed: i - index };
	}

	const digits = readDigits(source, i);
	if (digits) {
		return { suffix: digits, consumed: digits.length };
	}

	return { suffix: '', consumed: 0 };
}

function readDigits(source: string, index: number): string {
	let i = index;
	while (i < source.length) {
		const char = source[i];
		if (!char || char < '0' || char > '9') {
			break;
		}
		i++;
	}
	return source.slice(index, i);
}
