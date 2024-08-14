import type { NonNullableProperties, ParseOptions } from './types.ts';
import { combine, compact, decode, is_regexp, maybe_map, merge } from './utils.ts';

const has = Object.prototype.hasOwnProperty;
const isArray = Array.isArray;

const defaults = {
	allowDots: false,
	allowEmptyArrays: false,
	allowPrototypes: false,
	allowSparse: false,
	arrayLimit: 20,
	charset: 'utf-8',
	charsetSentinel: false,
	comma: false,
	decodeDotInKeys: false,
	decoder: decode,
	delimiter: '&',
	depth: 5,
	duplicates: 'combine',
	ignoreQueryPrefix: false,
	interpretNumericEntities: false,
	parameterLimit: 1000,
	parseArrays: true,
	plainObjects: false,
	strictDepth: false,
	strictNullHandling: false,
} as NonNullableProperties<ParseOptions>;

function interpret_numeric_entities(str: string) {
	return str.replace(/&#(\d+);/g, function (_, numberStr) {
		return String.fromCharCode(parseInt(numberStr, 10));
	});
}

function parse_array_value(val: string | string[], options: ParseOptions): string[] {
	if (val && typeof val === 'string' && options.comma && val.indexOf(',') > -1) {
		return val.split(',');
	}

	// @ts-ignore
	return val;
}

// This is what browsers will submit when the ✓ character occurs in an
// application/x-www-form-urlencoded body and the encoding of the page containing
// the form is iso-8859-1, or when the submitted form has an accept-charset
// attribute of iso-8859-1. Presumably also with other charsets that do not contain
// the ✓ character, such as us-ascii.
const iso_sentinel = 'utf8=%26%2310003%3B'; // encodeURIComponent('&#10003;')

// These are the percent-encoded utf-8 octets representing a checkmark, indicating that the request actually is utf-8 encoded.
const charset_sentinel = 'utf8=%E2%9C%93'; // encodeURIComponent('✓')

function parse_values(str: string, options: ParseOptions) {
	const obj = { __proto__: null };

	let clean_str = options.ignoreQueryPrefix ? str.replace(/^\?/, '') : str;
	clean_str = clean_str.replace(/%5B/gi, '[').replace(/%5D/gi, ']');
	const limit = options.parameterLimit === Infinity ? undefined : options.parameterLimit;
	const parts = clean_str.split(options.delimiter!, limit);
	let skip_index = -1; // Keep track of where the utf8 sentinel was found
	let i;

	let charset = options.charset;
	if (options.charsetSentinel) {
		for (i = 0; i < parts.length; ++i) {
			if (parts[i].indexOf('utf8=') === 0) {
				if (parts[i] === charset_sentinel) {
					charset = 'utf-8';
				} else if (parts[i] === iso_sentinel) {
					charset = 'iso-8859-1';
				}
				skip_index = i;
				i = parts.length; // The eslint settings do not allow break;
			}
		}
	}

	for (i = 0; i < parts.length; ++i) {
		if (i === skip_index) {
			continue;
		}
		const part = parts[i];

		const bracket_equals_pos = part.indexOf(']=');
		const pos = bracket_equals_pos === -1 ? part.indexOf('=') : bracket_equals_pos + 1;

		let key: string, val: string | string[] | null;
		if (pos === -1) {
			// @ts-expect-error
			key = options.decoder!(part, defaults.decoder, charset, 'key');
			val = options.strictNullHandling ? null : '';
		} else {
			// @ts-expect-error
			key = options.decoder!(part.slice(0, pos), defaults.decoder, charset, 'key');

			val = maybe_map(parse_array_value(part.slice(pos + 1), options), function (encodedVal) {
				// @ts-expect-error
				return options.decoder!(encodedVal, defaults.decoder, charset, 'value');
			});
		}

		if (val && options.interpretNumericEntities && charset === 'iso-8859-1') {
			// @ts-expect-error this is such a terrible codebase, nothing makes sense
			val = interpret_numeric_entities(val);
		}

		if (part.indexOf('[]=') > -1) {
			// @ts-expect-error again, this is such a terrible codebase
			val = isArray(val) ? [val] : val;
		}

		const existing = has.call(obj, key);
		if (existing && options.duplicates === 'combine') {
			// @ts-ignore
			obj[key] = combine(obj[key], val);
		} else if (!existing || options.duplicates === 'last') {
			// @ts-ignore
			obj[key] = val;
		}
	}

	return obj;
}

function parse_object(
	chain: string[],
	val: string | string[],
	options: ParseOptions,
	values_parsed: boolean,
) {
	let leaf = values_parsed ? val : parse_array_value(val, options);

	for (let i = chain.length - 1; i >= 0; --i) {
		let obj;
		const root = chain[i];

		if (root === '[]' && options.parseArrays) {
			obj =
				options.allowEmptyArrays && (leaf === '' || (options.strictNullHandling && leaf === null))
					? []
					: ([] as string[]).concat(leaf);
		} else {
			obj = options.plainObjects ? Object.create(null) : {};
			const clean_root =
				root.charAt(0) === '[' && root.charAt(root.length - 1) === ']' ? root.slice(1, -1) : root;
			const decoded_root = options.decodeDotInKeys ? clean_root.replace(/%2E/g, '.') : clean_root;
			const index = parseInt(decoded_root, 10);
			if (!options.parseArrays && decoded_root === '') {
				obj = { 0: leaf };
			} else if (
				!isNaN(index) &&
				root !== decoded_root &&
				String(index) === decoded_root &&
				index >= 0 &&
				options.parseArrays &&
				index <= options.arrayLimit!
			) {
				obj = [];
				obj[index] = leaf;
			} else if (decoded_root !== '__proto__') {
				obj[decoded_root] = leaf;
			}
		}

		leaf = obj;
	}

	return leaf;
}

function parseKeys(
	given_key: string,
	val: string | string[],
	options: NonNullableProperties<ParseOptions>,
	values_parsed: boolean,
) {
	if (!given_key) {
		return;
	}

	// Transform dot notation to bracket notation
	const key = options.allowDots ? given_key.replace(/\.([^.[]+)/g, '[$1]') : given_key;

	// The regex chunks

	const brackets = /(\[[^[\]]*])/;
	const child = /(\[[^[\]]*])/g;

	// Get the parent

	let segment = +options.depth > 0 && brackets.exec(key);
	const parent = segment ? key.slice(0, segment.index) : key;

	// Stash the parent if it exists

	const keys = [];
	if (parent) {
		// If we aren't using plain objects, optionally prefix keys that would overwrite object prototype properties
		if (!options.plainObjects && has.call(Object.prototype, parent)) {
			if (!options.allowPrototypes) {
				return;
			}
		}

		keys.push(parent);
	}

	// Loop through children appending to the array until we hit depth

	let i = 0;
	while (+options.depth > 0 && (segment = child.exec(key)) !== null && i < +options.depth) {
		i += 1;
		if (!options.plainObjects && has.call(Object.prototype, segment[1].slice(1, -1))) {
			if (!options.allowPrototypes) {
				return;
			}
		}
		keys.push(segment[1]);
	}

	// If there's a remainder, check strictDepth option for throw, else just add whatever is left

	if (segment) {
		if (options.strictDepth) {
			throw new RangeError(
				'Input depth exceeded depth option of ' + options.depth + ' and strictDepth is true',
			);
		}
		keys.push('[' + key.slice(segment.index) + ']');
	}

	return parse_object(keys, val, options, values_parsed);
}

function normalize_parse_options(
	opts: ParseOptions | undefined,
): NonNullableProperties<ParseOptions> {
	if (!opts) {
		return defaults;
	}

	if (typeof opts.allowEmptyArrays !== 'undefined' && typeof opts.allowEmptyArrays !== 'boolean') {
		throw new TypeError('`allowEmptyArrays` option can only be `true` or `false`, when provided');
	}

	if (typeof opts.decodeDotInKeys !== 'undefined' && typeof opts.decodeDotInKeys !== 'boolean') {
		throw new TypeError('`decodeDotInKeys` option can only be `true` or `false`, when provided');
	}

	if (
		opts.decoder !== null &&
		typeof opts.decoder !== 'undefined' &&
		typeof opts.decoder !== 'function'
	) {
		throw new TypeError('Decoder has to be a function.');
	}

	if (
		typeof opts.charset !== 'undefined' &&
		opts.charset !== 'utf-8' &&
		opts.charset !== 'iso-8859-1'
	) {
		throw new TypeError('The charset option must be either utf-8, iso-8859-1, or undefined');
	}
	const charset = typeof opts.charset === 'undefined' ? defaults.charset : opts.charset;

	const duplicates = typeof opts.duplicates === 'undefined' ? defaults.duplicates : opts.duplicates;

	if (duplicates !== 'combine' && duplicates !== 'first' && duplicates !== 'last') {
		throw new TypeError('The duplicates option must be either combine, first, or last');
	}

	const allow_dots =
		typeof opts.allowDots === 'undefined'
			? opts.decodeDotInKeys === true
				? true
				: defaults.allowDots
			: !!opts.allowDots;

	return {
		allowDots: allow_dots,
		allowEmptyArrays:
			typeof opts.allowEmptyArrays === 'boolean'
				? !!opts.allowEmptyArrays
				: defaults.allowEmptyArrays,
		allowPrototypes:
			typeof opts.allowPrototypes === 'boolean' ? opts.allowPrototypes : defaults.allowPrototypes,
		allowSparse: typeof opts.allowSparse === 'boolean' ? opts.allowSparse : defaults.allowSparse,
		arrayLimit: typeof opts.arrayLimit === 'number' ? opts.arrayLimit : defaults.arrayLimit,
		charset: charset,
		charsetSentinel:
			typeof opts.charsetSentinel === 'boolean' ? opts.charsetSentinel : defaults.charsetSentinel,
		comma: typeof opts.comma === 'boolean' ? opts.comma : defaults.comma,
		decodeDotInKeys:
			typeof opts.decodeDotInKeys === 'boolean' ? opts.decodeDotInKeys : defaults.decodeDotInKeys,
		decoder: typeof opts.decoder === 'function' ? opts.decoder : defaults.decoder,
		delimiter:
			typeof opts.delimiter === 'string' || is_regexp(opts.delimiter)
				? opts.delimiter!
				: defaults.delimiter,
		// eslint-disable-next-line no-implicit-coercion, no-extra-parens
		depth: typeof opts.depth === 'number' || opts.depth === false ? +opts.depth : defaults.depth,
		duplicates: duplicates,
		ignoreQueryPrefix: opts.ignoreQueryPrefix === true,
		interpretNumericEntities:
			typeof opts.interpretNumericEntities === 'boolean'
				? opts.interpretNumericEntities
				: defaults.interpretNumericEntities,
		parameterLimit:
			typeof opts.parameterLimit === 'number' ? opts.parameterLimit : defaults.parameterLimit,
		parseArrays: opts.parseArrays !== false,
		plainObjects:
			typeof opts.plainObjects === 'boolean' ? opts.plainObjects : defaults.plainObjects,
		strictDepth: typeof opts.strictDepth === 'boolean' ? !!opts.strictDepth : defaults.strictDepth,
		strictNullHandling:
			typeof opts.strictNullHandling === 'boolean'
				? opts.strictNullHandling
				: defaults.strictNullHandling,
	};
}

export function parse(str: string, opts: ParseOptions = {}) {
	const options = normalize_parse_options(opts);

	if (str === '' || str === null || typeof str === 'undefined') {
		return options.plainObjects ? Object.create(null) : {};
	}

	const temp_obj = typeof str === 'string' ? parse_values(str, options) : str;
	let obj = options.plainObjects ? Object.create(null) : {};

	// Iterate over the keys and setup the new object

	const keys = Object.keys(temp_obj);
	for (let i = 0; i < keys.length; ++i) {
		const key = keys[i];
		// @ts-expect-error
		const newObj = parseKeys(key, temp_obj[key], options, typeof str === 'string');
		obj = merge(obj, newObj, options);
	}

	if (options.allowSparse === true) {
		return obj;
	}

	return compact(obj);
}
