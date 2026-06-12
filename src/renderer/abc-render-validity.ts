import type { TuneObject } from 'abcjs';
import { normalizeAbcBlockBody } from '../plugin/block-source';
import { parseAbc } from '../serializer/abc-parser';

const ABCJS_MUSIC_PARSE_ERROR = /Unknown character|Error parsing|Unexpected/i;

/** True when abcjs reported music-line parse problems (e.g. prose in the body). */
export function abcjsTuneHasMusicParseErrors(tune: TuneObject | undefined): boolean {
	if (!tune?.warnings?.length) {
		return false;
	}
	return tune.warnings.some((warning) => ABCJS_MUSIC_PARSE_ERROR.test(warning));
}

/** True when our parser skipped unrecognized symbols in the fence body. */
export function abcSourceHasUnsupportedSymbols(source: string): boolean {
	const parsed = parseAbc(normalizeAbcBlockBody(source));
	return parsed.warnings.some((warning) => warning.kind === 'unsupported');
}
