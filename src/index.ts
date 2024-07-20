import { default_format, formatters } from './formats';

const formats = {
	formatters,
	RFC1738: 'RFC1738',
	RFC3986: 'RFC3986',
	default: default_format,
};

export { parse } from './parse';
export { stringify } from './stringify';
export { formats };

export type {
	DefaultDecoder,
	DefaultEncoder,
	Format,
	ParseOptions,
	StringifyOptions,
} from './types';
