import iconv from 'iconv-lite';
import { assert, describe, expect, test } from 'vitest';
import { parse } from '../src';
import { decode } from '../src/utils';
import { empty_test_cases } from './empty-keys-cases';

describe('parse()', () => {
	test('parses a simple string', () => {
		expect(parse('0=foo')).toEqual({ 0: 'foo' });
		expect(parse('foo=c++')).toEqual({ foo: 'c  ' });
		expect(parse('a[>=]=23')).toEqual({ a: { '>=': '23' } });
		expect(parse('a[<=>]==23')).toEqual({ a: { '<=>': '=23' } });
		expect(parse('a[==]=23')).toEqual({ a: { '==': '23' } });
		expect(parse('foo', { strictNullHandling: true })).toEqual({ foo: null });
		expect(parse('foo')).toEqual({ foo: '' });
		expect(parse('foo=')).toEqual({ foo: '' });
		expect(parse('foo=bar')).toEqual({ foo: 'bar' });
		expect(parse(' foo = bar = baz ')).toEqual({ ' foo ': ' bar = baz ' });
		expect(parse('foo=bar=baz')).toEqual({ foo: 'bar=baz' });
		expect(parse('foo=bar&bar=baz')).toEqual({ foo: 'bar', bar: 'baz' });
		expect(parse('foo2=bar2&baz2=')).toEqual({ foo2: 'bar2', baz2: '' });
		expect(parse('foo=bar&baz', { strictNullHandling: true })).toEqual({
			foo: 'bar',
			baz: null,
		});
		expect(parse('foo=bar&baz')).toEqual({ foo: 'bar', baz: '' });
		expect(parse('cht=p3&chd=t:60,40&chs=250x100&chl=Hello|World')).toEqual({
			cht: 'p3',
			chd: 't:60,40',
			chs: '250x100',
			chl: 'Hello|World',
		});
	});

	test('comma: false', () => {
		expect(parse('a[]=b&a[]=c')).toEqual({ a: ['b', 'c'] });
		expect(parse('a[0]=b&a[1]=c')).toEqual({ a: ['b', 'c'] });
		expect(parse('a=b,c')).toEqual({ a: 'b,c' });
		expect(parse('a=b&a=c')).toEqual({ a: ['b', 'c'] });
	});

	test('comma: true', function (st) {
		expect(parse('a[]=b&a[]=c', { comma: true })).toEqual({ a: ['b', 'c'] });
		expect(parse('a[0]=b&a[1]=c', { comma: true })).toEqual({ a: ['b', 'c'] });
		expect(parse('a=b,c', { comma: true })).toEqual({ a: ['b', 'c'] });
		expect(parse('a=b&a=c', { comma: true })).toEqual({ a: ['b', 'c'] });
	});

	test('allows enabling dot notation', function (st) {
		expect(parse('a.b=c')).toEqual({ 'a.b': 'c' });
		expect(parse('a.b=c', { allowDots: true })).toEqual({ a: { b: 'c' } });
	});

	test('decode dot keys correctly', function (st) {
		// st.deepEqual(
		// 	parse('name%252Eobj.first=John&name%252Eobj.last=Doe', {
		// 		allowDots: false,
		// 		decodeDotInKeys: false,
		// 	}),
		// 	{ 'name%2Eobj.first': 'John', 'name%2Eobj.last': 'Doe' },
		// 	'with allowDots false and decodeDotInKeys false',
		// );
		expect(
			parse('name%252Eobj.first=John&name%252Eobj.last=Doe', {
				allowDots: false,
				decodeDotInKeys: false,
			}),
		).toEqual({
			'name%2Eobj.first': 'John',
			'name%2Eobj.last': 'Doe',
		});
		// st.deepEqual(
		// 	parse('name.obj.first=John&name.obj.last=Doe', {
		// 		allowDots: true,
		// 		decodeDotInKeys: false,
		// 	}),
		// 	{ name: { obj: { first: 'John', last: 'Doe' } } },
		// 	'with allowDots false and decodeDotInKeys false',
		// );
		expect(
			parse('name.obj.first=John&name.obj.last=Doe', {
				allowDots: true,
				decodeDotInKeys: false,
			}),
		).toEqual({ name: { obj: { first: 'John', last: 'Doe' } } });
		// st.deepEqual(
		// 	parse('name%252Eobj.first=John&name%252Eobj.last=Doe', {
		// 		allowDots: true,
		// 		decodeDotInKeys: false,
		// 	}),
		// 	{ 'name%2Eobj': { first: 'John', last: 'Doe' } },
		// 	'with allowDots true and decodeDotInKeys false',
		// );
		expect(
			parse('name%252Eobj.first=John&name%252Eobj.last=Doe', {
				allowDots: true,
				decodeDotInKeys: false,
			}),
		).toEqual({ 'name%2Eobj': { first: 'John', last: 'Doe' } });
		// st.deepEqual(
		// 	parse('name%252Eobj.first=John&name%252Eobj.last=Doe', {
		// 		allowDots: true,
		// 		decodeDotInKeys: true,
		// 	}),
		// 	{ 'name.obj': { first: 'John', last: 'Doe' } },
		// 	'with allowDots true and decodeDotInKeys true',
		// );
		expect(
			parse('name%252Eobj.first=John&name%252Eobj.last=Doe', {
				allowDots: true,
				decodeDotInKeys: true,
			}),
		).toEqual({ 'name.obj': { first: 'John', last: 'Doe' } });

		// st.deepEqual(
		// parse(
		// 	'name%252Eobj%252Esubobject.first%252Egodly%252Ename=John&name%252Eobj%252Esubobject.last=Doe',
		// 	{ allowDots: false, decodeDotInKeys: false },
		// ),
		// 	{
		// 		'name%2Eobj%2Esubobject.first%2Egodly%2Ename': 'John',
		// 		'name%2Eobj%2Esubobject.last': 'Doe',
		// 	},
		// 	'with allowDots false and decodeDotInKeys false',
		// );
		expect(
			parse(
				'name%252Eobj%252Esubobject.first%252Egodly%252Ename=John&name%252Eobj%252Esubobject.last=Doe',
				{ allowDots: false, decodeDotInKeys: false },
			),
		).toEqual({
			'name%2Eobj%2Esubobject.first%2Egodly%2Ename': 'John',
			'name%2Eobj%2Esubobject.last': 'Doe',
		});
		// st.deepEqual(
		// parse('name.obj.subobject.first.godly.name=John&name.obj.subobject.last=Doe', {
		// 	allowDots: true,
		// 	decodeDotInKeys: false,
		// }),
		// 	{ name: { obj: { subobject: { first: { godly: { name: 'John' } }, last: 'Doe' } } } },
		// 	'with allowDots true and decodeDotInKeys false',
		// );
		expect(
			parse('name.obj.subobject.first.godly.name=John&name.obj.subobject.last=Doe', {
				allowDots: true,
				decodeDotInKeys: false,
			}),
		).toEqual({
			name: { obj: { subobject: { first: { godly: { name: 'John' } }, last: 'Doe' } } },
		});
		// st.deepEqual(
		// 	parse(
		// 		'name%252Eobj%252Esubobject.first%252Egodly%252Ename=John&name%252Eobj%252Esubobject.last=Doe',
		// 		{ allowDots: true, decodeDotInKeys: true },
		// 	),
		// 	{ 'name.obj.subobject': { 'first.godly.name': 'John', last: 'Doe' } },
		// 	'with allowDots true and decodeDotInKeys true',
		// );
		expect(
			parse(
				'name%252Eobj%252Esubobject.first%252Egodly%252Ename=John&name%252Eobj%252Esubobject.last=Doe',
				{ allowDots: true, decodeDotInKeys: true },
			),
		).toEqual({ 'name.obj.subobject': { 'first.godly.name': 'John', last: 'Doe' } });
		// st.deepEqual(
		// 	parse('name%252Eobj.first=John&name%252Eobj.last=Doe'),
		// 	{ 'name%2Eobj.first': 'John', 'name%2Eobj.last': 'Doe' },
		// 	'with allowDots and decodeDotInKeys undefined',
		// );
		expect(parse('name%252Eobj.first=John&name%252Eobj.last=Doe')).toEqual({
			'name%2Eobj.first': 'John',
			'name%2Eobj.last': 'Doe',
		});
	});

	test('should decode dot in key of object, and allow enabling dot notation when decodeDotInKeys is set to true and allowDots is undefined', function (st) {
		expect(
			parse(
				'name%252Eobj%252Esubobject.first%252Egodly%252Ename=John&name%252Eobj%252Esubobject.last=Doe',
				{ decodeDotInKeys: true },
			),
		).toEqual({ 'name.obj.subobject': { 'first.godly.name': 'John', last: 'Doe' } });
	});

	test('should throw when decodeDotInKeys is not of type boolean', function (st) {
		expect(() => {
			// @ts-expect-error
			parse('foo[]&bar=baz', { decodeDotInKeys: 'foobar' });
		}).toThrowError(TypeError);

		expect(() => {
			// @ts-expect-error
			parse('foo[]&bar=baz', { decodeDotInKeys: 0 });
		}).toThrowError(TypeError);

		expect(() => {
			// @ts-expect-error
			parse('foo[]&bar=baz', { decodeDotInKeys: NaN });
		}).toThrowError(TypeError);

		expect(() => {
			// @ts-expect-error
			parse('foo[]&bar=baz', { decodeDotInKeys: null });
		}).toThrowError(TypeError);
	});

	test('allows empty arrays in obj values', function (st) {
		expect(parse('foo[]&bar=baz', { allowEmptyArrays: true })).toEqual({ foo: [], bar: 'baz' });
		expect(parse('foo[]&bar=baz', { allowEmptyArrays: false })).toEqual({
			foo: [''],
			bar: 'baz',
		});
	});

	test('should throw when allowEmptyArrays is not of type boolean', function (st) {
		// st['throws'](function () {
		//     parse('foo[]&bar=baz', { allowEmptyArrays: 'foobar' });
		// }, TypeError);

		// st['throws'](function () {
		//     parse('foo[]&bar=baz', { allowEmptyArrays: 0 });
		// }, TypeError);
		// st['throws'](function () {
		//     parse('foo[]&bar=baz', { allowEmptyArrays: NaN });
		// }, TypeError);

		// st['throws'](function () {
		//     parse('foo[]&bar=baz', { allowEmptyArrays: null });
		// }, TypeError);

		expect(() => {
			// @ts-expect-error
			parse('foo[]&bar=baz', { allowEmptyArrays: 'foobar' });
		}).toThrowError(TypeError);

		expect(() => {
			// @ts-expect-error
			parse('foo[]&bar=baz', { allowEmptyArrays: 0 });
		}).toThrowError(TypeError);

		expect(() => {
			// @ts-expect-error
			parse('foo[]&bar=baz', { allowEmptyArrays: NaN });
		}).toThrowError(TypeError);

		expect(() => {
			// @ts-expect-error
			parse('foo[]&bar=baz', { allowEmptyArrays: null });
		}).toThrowError(TypeError);
	});

	test('allowEmptyArrays + strictNullHandling', function (st) {
		expect(parse('testEmptyArray[]', { strictNullHandling: true, allowEmptyArrays: true })).toEqual(
			{ testEmptyArray: [] },
		);
	});

	// deepEqual(parse('a[b]=c'), { a: { b: 'c' } }, 'parses a single nested string');
	test('parses a single nested string', () => {
		expect(parse('a[b]=c')).toEqual({ a: { b: 'c' } });
	});

	test('parses a double nested string', () => {
		expect(parse('a[b][c]=d')).toEqual({ a: { b: { c: 'd' } } });
	});

	test('defaults to a depth of 5', () => {
		expect(parse('a[b][c][d][e][f][g][h]=i')).toEqual({
			a: { b: { c: { d: { e: { f: { '[g][h]': 'i' } } } } } },
		});
	});

	test('only parses one level when depth = 1', () => {
		expect(parse('a[b][c]=d', { depth: 1 })).toEqual({ a: { b: { '[c]': 'd' } } });
		expect(parse('a[b][c][d]=e', { depth: 1 })).toEqual({ a: { b: { '[c][d]': 'e' } } });
	});

	test('uses original key when depth = 0', function (st) {
		expect(parse('a[0]=b&a[1]=c', { depth: 0 })).toEqual({ 'a[0]': 'b', 'a[1]': 'c' });
		expect(parse('a[0][0]=b&a[0][1]=c&a[1]=d&e=2', { depth: 0 })).toEqual({
			'a[0][0]': 'b',
			'a[0][1]': 'c',
			'a[1]': 'd',
			e: '2',
		});
	});

	test('uses original key when depth = false', function (st) {
		expect(parse('a[0]=b&a[1]=c', { depth: false })).toEqual({ 'a[0]': 'b', 'a[1]': 'c' });
		expect(parse('a[0][0]=b&a[0][1]=c&a[1]=d&e=2', { depth: false })).toEqual({
			'a[0][0]': 'b',
			'a[0][1]': 'c',
			'a[1]': 'd',
			e: '2',
		});
	});

	// deepEqual(parse('a=b&a=c'), { a: ['b', 'c'] }, 'parses a simple array');
	test('parses a simple array', () => {
		expect(parse('a=b&a=c')).toEqual({ a: ['b', 'c'] });
	});

	test('parses an explicit array', function (st) {
		expect(parse('a[]=b')).toEqual({ a: ['b'] });
		expect(parse('a[]=b&a[]=c')).toEqual({ a: ['b', 'c'] });
		expect(parse('a[]=b&a[]=c&a[]=d')).toEqual({ a: ['b', 'c', 'd'] });
	});

	test('parses a mix of simple and explicit arrays', function (st) {
		expect(parse('a=b&a[]=c')).toEqual({ a: ['b', 'c'] });
		expect(parse('a[]=b&a=c')).toEqual({ a: ['b', 'c'] });
		expect(parse('a[0]=b&a=c')).toEqual({ a: ['b', 'c'] });
		expect(parse('a=b&a[0]=c')).toEqual({ a: ['b', 'c'] });

		expect(parse('a[1]=b&a=c', { arrayLimit: 20 })).toEqual({ a: ['b', 'c'] });
		expect(parse('a[]=b&a=c', { arrayLimit: 0 })).toEqual({ a: ['b', 'c'] });
		expect(parse('a[]=b&a=c')).toEqual({ a: ['b', 'c'] });

		expect(parse('a=b&a[1]=c', { arrayLimit: 20 })).toEqual({ a: ['b', 'c'] });
		expect(parse('a=b&a[]=c', { arrayLimit: 0 })).toEqual({ a: ['b', 'c'] });
		expect(parse('a=b&a[]=c')).toEqual({ a: ['b', 'c'] });
	});

	test('parses a nested array', function (st) {
		expect(parse('a[b][]=c&a[b][]=d')).toEqual({ a: { b: ['c', 'd'] } });
		expect(parse('a[>=]=25')).toEqual({ a: { '>=': '25' } });
	});

	test('allows to specify array indices', function (st) {
		expect(parse('a[1]=c&a[0]=b&a[2]=d')).toEqual({ a: ['b', 'c', 'd'] });
		expect(parse('a[1]=c&a[0]=b')).toEqual({ a: ['b', 'c'] });
		expect(parse('a[1]=c', { arrayLimit: 20 })).toEqual({ a: ['c'] });
		expect(parse('a[1]=c', { arrayLimit: 0 })).toEqual({ a: { 1: 'c' } });
		expect(parse('a[1]=c')).toEqual({ a: ['c'] });
	});

	test('limits specific array indices to arrayLimit', function (st) {
		expect(parse('a[20]=a', { arrayLimit: 20 })).toEqual({ a: ['a'] });
		expect(parse('a[21]=a', { arrayLimit: 20 })).toEqual({ a: { 21: 'a' } });

		expect(parse('a[20]=a')).toEqual({ a: ['a'] });
		expect(parse('a[21]=a')).toEqual({ a: { 21: 'a' } });
	});

	test('supports keys that begin with a number', () => {
		expect(parse('a[12b]=c')).toEqual({ a: { '12b': 'c' } });
	});

	test('supports encoded = signs', function (st) {
		expect(parse('he%3Dllo=th%3Dere')).toEqual({ 'he=llo': 'th=ere' });
	});

	test('is ok with url encoded strings', function (st) {
		expect(parse('a[b%20c]=d')).toEqual({ a: { 'b c': 'd' } });
		expect(parse('a[b]=c%20d')).toEqual({ a: { b: 'c d' } });
	});

	test('allows brackets in the value', function (st) {
		expect(parse('pets=["tobi"]')).toEqual({ pets: '["tobi"]' });
		expect(parse('operators=[">=", "<="]')).toEqual({ operators: '[">=", "<="]' });
	});

	test('allows empty values', function (st) {
		expect(parse('')).toEqual({});
		// @ts-expect-error
		expect(parse(null)).toEqual({});
		// @ts-expect-error
		expect(parse(undefined)).toEqual({});
	});

	test('transforms arrays to objects', function (st) {
		expect(parse('foo[0]=bar&foo[bad]=baz')).toEqual({ foo: { 0: 'bar', bad: 'baz' } });
		expect(parse('foo[bad]=baz&foo[0]=bar')).toEqual({ foo: { bad: 'baz', 0: 'bar' } });
		expect(parse('foo[bad]=baz&foo[]=bar')).toEqual({ foo: { bad: 'baz', 0: 'bar' } });
		expect(parse('foo[]=bar&foo[bad]=baz')).toEqual({ foo: { 0: 'bar', bad: 'baz' } });
		expect(parse('foo[bad]=baz&foo[]=bar&foo[]=foo')).toEqual({
			foo: { bad: 'baz', 0: 'bar', 1: 'foo' },
		});
		expect(parse('foo[0][a]=a&foo[0][b]=b&foo[1][a]=aa&foo[1][b]=bb')).toEqual({
			foo: [
				{ a: 'a', b: 'b' },
				{ a: 'aa', b: 'bb' },
			],
		});

		expect(parse('a[]=b&a[t]=u&a[hasOwnProperty]=c', { allowPrototypes: false })).toEqual({
			a: { 0: 'b', t: 'u' },
		});
		expect(parse('a[]=b&a[t]=u&a[hasOwnProperty]=c', { allowPrototypes: true })).toEqual({
			a: { 0: 'b', t: 'u', hasOwnProperty: 'c' },
		});
		expect(parse('a[]=b&a[hasOwnProperty]=c&a[x]=y', { allowPrototypes: false })).toEqual({
			a: { 0: 'b', x: 'y' },
		});
		expect(parse('a[]=b&a[hasOwnProperty]=c&a[x]=y', { allowPrototypes: true })).toEqual({
			a: { 0: 'b', hasOwnProperty: 'c', x: 'y' },
		});
	});

	test('transforms arrays to objects (dot notation)', function (st) {
		// st.deepEqual(parse('foo[0].baz=bar&fool.bad=baz', { allowDots: true }), {
		// 	foo: [{ baz: 'bar' }],
		// 	fool: { bad: 'baz' },
		// });
		// st.deepEqual(parse('foo[0].baz=bar&fool.bad.boo=baz', { allowDots: true }), {
		// 	foo: [{ baz: 'bar' }],
		// 	fool: { bad: { boo: 'baz' } },
		// });
		// st.deepEqual(parse('foo[0][0].baz=bar&fool.bad=baz', { allowDots: true }), {
		// 	foo: [[{ baz: 'bar' }]],
		// 	fool: { bad: 'baz' },
		// });
		// st.deepEqual(parse('foo[0].baz[0]=15&foo[0].bar=2', { allowDots: true }), {
		// 	foo: [{ baz: ['15'], bar: '2' }],
		// });
		// st.deepEqual(parse('foo[0].baz[0]=15&foo[0].baz[1]=16&foo[0].bar=2', { allowDots: true }), {
		// 	foo: [{ baz: ['15', '16'], bar: '2' }],
		// });
		// st.deepEqual(parse('foo.bad=baz&foo[0]=bar', { allowDots: true }), {
		// 	foo: { bad: 'baz', 0: 'bar' },
		// });
		// st.deepEqual(parse('foo.bad=baz&foo[]=bar', { allowDots: true }), {
		// 	foo: { bad: 'baz', 0: 'bar' },
		// });
		// st.deepEqual(parse('foo[]=bar&foo.bad=baz', { allowDots: true }), {
		// 	foo: { 0: 'bar', bad: 'baz' },
		// });
		// st.deepEqual(parse('foo.bad=baz&foo[]=bar&foo[]=foo', { allowDots: true }), {
		// 	foo: { bad: 'baz', 0: 'bar', 1: 'foo' },
		// });
		// st.deepEqual(parse('foo[0].a=a&foo[0].b=b&foo[1].a=aa&foo[1].b=bb', { allowDots: true }), {
		// 	foo: [
		// 		{ a: 'a', b: 'b' },
		// 		{ a: 'aa', b: 'bb' },
		// 	],
		// });
		expect(parse('foo[0].a=a&foo[0].b=b&foo[1].a=aa&foo[1].b=bb', { allowDots: true })).toEqual({
			foo: [
				{ a: 'a', b: 'b' },
				{ a: 'aa', b: 'bb' },
			],
		});
		expect(parse('foo[0].a=a&foo[0].b=b&foo[1].a=aa&foo[1].b=bb', { allowDots: true })).toEqual({
			foo: [
				{ a: 'a', b: 'b' },
				{ a: 'aa', b: 'bb' },
			],
		});
		expect(parse('foo.bad=baz&foo[0]=bar', { allowDots: true })).toEqual({
			foo: { bad: 'baz', 0: 'bar' },
		});
		expect(parse('foo.bad=baz&foo[]=bar', { allowDots: true })).toEqual({
			foo: { bad: 'baz', 0: 'bar' },
		});
		expect(parse('foo[]=bar&foo.bad=baz', { allowDots: true })).toEqual({
			foo: { 0: 'bar', bad: 'baz' },
		});
		expect(parse('foo.bad=baz&foo[]=bar&foo[]=foo', { allowDots: true })).toEqual({
			foo: { bad: 'baz', 0: 'bar', 1: 'foo' },
		});
		expect(parse('foo[0].a=a&foo[0].b=b&foo[1].a=aa&foo[1].b=bb', { allowDots: true })).toEqual({
			foo: [
				{ a: 'a', b: 'b' },
				{ a: 'aa', b: 'bb' },
			],
		});
		expect(parse('a[]=b&a[t]=u&a[hasOwnProperty]=c', { allowPrototypes: false })).toEqual({
			a: { 0: 'b', t: 'u' },
		});
		expect(parse('a[]=b&a[t]=u&a[hasOwnProperty]=c', { allowPrototypes: true })).toEqual({
			a: { 0: 'b', t: 'u', hasOwnProperty: 'c' },
		});
		expect(parse('a[]=b&a[hasOwnProperty]=c&a[x]=y', { allowPrototypes: false })).toEqual({
			a: { 0: 'b', x: 'y' },
		});
		expect(parse('a[]=b&a[hasOwnProperty]=c&a[x]=y', { allowPrototypes: true })).toEqual({
			a: { 0: 'b', hasOwnProperty: 'c', x: 'y' },
		});
	});

	test('correctly prunes undefined values when converting an array to an object', function (st) {
		expect(parse('a[2]=b&a[99999999]=c')).toEqual({ a: { 2: 'b', 99999999: 'c' } });
	});

	test('supports malformed uri characters', function (st) {
		expect(parse('{%:%}', { strictNullHandling: true })).toEqual({ '{%:%}': null });
		expect(parse('{%:%}=')).toEqual({ '{%:%}': '' });
		expect(parse('foo=%:%}')).toEqual({ foo: '%:%}' });
	});

	test("doesn't produce empty keys", function (st) {
		// st.deepEqual(parse('_r=1&'), { _r: '1' });
		expect(parse('_r=1&')).toEqual({ _r: '1' });
	});

	test('cannot access Object prototype', function (st) {
		parse('constructor[prototype][bad]=bad');
		parse('bad[constructor][prototype][bad]=bad');

		// @ts-expect-error
		expect(typeof Object.prototype.bad).toBe('undefined');
	});

	test('parses arrays of objects', function (st) {
		expect(parse('a[][b]=c')).toEqual({ a: [{ b: 'c' }] });
		expect(parse('a[0][b]=c')).toEqual({ a: [{ b: 'c' }] });
	});

	test('allows for empty strings in arrays', function (st) {
		// st.deepEqual(parse('a[]=b&a[]=&a[]=c'), { a: ['b', '', 'c'] });
		expect(parse('a[]=b&a[]=&a[]=c')).toEqual({ a: ['b', '', 'c'] });

		expect(
			parse('a[0]=b&a[1]&a[2]=c&a[19]=', { strictNullHandling: true, arrayLimit: 20 }),
		).toEqual({ a: ['b', null, 'c', ''] });
		expect(parse('a[]=b&a[]&a[]=c&a[]=', { strictNullHandling: true, arrayLimit: 0 })).toEqual({
			a: ['b', null, 'c', ''],
		});
		expect(
			parse('a[0]=b&a[1]=&a[2]=c&a[19]', { strictNullHandling: true, arrayLimit: 20 }),
		).toEqual({ a: ['b', '', 'c', null] });
		expect(parse('a[]=b&a[]=&a[]=c&a[]', { strictNullHandling: true, arrayLimit: 0 })).toEqual({
			a: ['b', '', 'c', null],
		});

		expect(parse('a[]=&a[]=b&a[]=c')).toEqual({ a: ['', 'b', 'c'] });
	});

	test('compacts sparse arrays', function (st) {
		expect(parse('a[10]=1&a[2]=2', { arrayLimit: 20 })).toEqual({ a: ['2', '1'] });
		expect(parse('a[1][b][2][c]=1', { arrayLimit: 20 })).toEqual({ a: [{ b: [{ c: '1' }] }] });
		expect(parse('a[1][2][3][c]=1', { arrayLimit: 20 })).toEqual({ a: [[[{ c: '1' }]]] });
		expect(parse('a[1][2][3][c][1]=1', { arrayLimit: 20 })).toEqual({ a: [[[{ c: ['1'] }]]] });
	});

	test('parses sparse arrays', function (st) {
		expect(parse('a[4]=1&a[1]=2', { allowSparse: true })).toEqual({ a: [, '2', , , '1'] });
		expect(parse('a[1][b][2][c]=1', { allowSparse: true })).toEqual({
			a: [, { b: [, , { c: '1' }] }],
		});
		expect(parse('a[1][2][3][c]=1', { allowSparse: true })).toEqual({
			a: [, [, , [, , , { c: '1' }]]],
		});
		expect(parse('a[1][2][3][c][1]=1', { allowSparse: true })).toEqual({
			a: [, [, , [, , , { c: [, '1'] }]]],
		});
	});

	test('parses semi-parsed strings', function (st) {
		// @ts-expect-error
		expect(parse({ 'a[b]': 'c' })).toEqual({ a: { b: 'c' } });
		// @ts-expect-error
		expect(parse({ 'a[b]': 'c', 'a[d]': 'e' })).toEqual({ a: { b: 'c', d: 'e' } });
	});

	test('parses buffers correctly', function (st) {
		var b = Buffer.from('test');

		// @ts-expect-error
		expect(parse({ a: b })).toEqual({ a: b });
	});

	test('parses jquery-param strings', function (st) {
		// readable = 'filter[0][]=int1&filter[0][]==&filter[0][]=77&filter[]=and&filter[2][]=int2&filter[2][]==&filter[2][]=8'
		var encoded =
			'filter%5B0%5D%5B%5D=int1&filter%5B0%5D%5B%5D=%3D&filter%5B0%5D%5B%5D=77&filter%5B%5D=and&filter%5B2%5D%5B%5D=int2&filter%5B2%5D%5B%5D=%3D&filter%5B2%5D%5B%5D=8';
		var expected = { filter: [['int1', '=', '77'], 'and', ['int2', '=', '8']] };

		expect(parse(encoded)).toEqual(expected);
	});

	test('continues parsing when no parent is found', function (st) {
		expect(parse('[]=&a=b')).toEqual({ 0: '', a: 'b' });
		expect(parse('[]&a=b', { strictNullHandling: true })).toEqual({ 0: null, a: 'b' });
		expect(parse('[foo]=bar')).toEqual({ foo: 'bar' });
	});

	test('does not error when parsing a very long array', function (st) {
		var str = 'a[]=a';
		while (Buffer.byteLength(str) < 128 * 1024) {
			str = str + '&' + str;
		}

		expect(() => {
			parse(str);
		}).not.toThrow();
	});

	test(
		'should not throw when a native prototype has an enumerable property',
		{ skip: true },
		function (st) {
			// @ts-expect-error
			Object.prototype.crash = '';
			// @ts-expect-error
			Array.prototype.crash = '';

			expect(() => {
				parse('a=b');
			}).not.toThrow();
			expect(parse('a=b')).toEqual({ a: 'b' });
			expect(() => {
				parse('a[][b]=c');
			}).not.toThrow();
			expect(parse('a[][b]=c')).toEqual({ a: [{ b: 'c' }] });
		},
	);

	test('parses a string with an alternative string delimiter', function (st) {
		expect(parse('a=b;c=d', { delimiter: ';' })).toEqual({ a: 'b', c: 'd' });
	});

	test('parses a string with an alternative RegExp delimiter', function (st) {
		expect(parse('a=b; c=d', { delimiter: /[;,] */ })).toEqual({ a: 'b', c: 'd' });
	});

	test('does not use non-splittable objects as delimiters', function (st) {
		// @ts-expect-error
		expect(parse('a=b&c=d', { delimiter: true })).toEqual({ a: 'b', c: 'd' });
	});

	test('allows overriding parameter limit', function (st) {
		expect(parse('a=b&c=d', { parameterLimit: 1 })).toEqual({ a: 'b' });
	});

	test('allows setting the parameter limit to Infinity', function (st) {
		expect(parse('a=b&c=d', { parameterLimit: Infinity })).toEqual({ a: 'b', c: 'd' });
	});

	test('allows overriding array limit', function (st) {
		expect(parse('a[0]=b', { arrayLimit: -1 })).toEqual({ a: { 0: 'b' } });
		expect(parse('a[0]=b', { arrayLimit: 0 })).toEqual({ a: ['b'] });

		expect(parse('a[-1]=b', { arrayLimit: -1 })).toEqual({ a: { '-1': 'b' } });
		expect(parse('a[-1]=b', { arrayLimit: 0 })).toEqual({ a: { '-1': 'b' } });

		expect(parse('a[0]=b&a[1]=c', { arrayLimit: -1 })).toEqual({ a: { 0: 'b', 1: 'c' } });
		expect(parse('a[0]=b&a[1]=c', { arrayLimit: 0 })).toEqual({ a: { 0: 'b', 1: 'c' } });
	});

	test('allows disabling array parsing', function (st) {
		var indices = parse('a[0]=b&a[1]=c', { parseArrays: false });
		expect(indices).toEqual({ a: { 0: 'b', 1: 'c' } });
		expect(Array.isArray(indices.a)).toBe(false);

		var emptyBrackets = parse('a[]=b', { parseArrays: false });
		expect(emptyBrackets).toEqual({ a: { 0: 'b' } });
		expect(Array.isArray(emptyBrackets.a)).toBe(false);
	});

	test('allows for query string prefix', function (st) {
		expect(parse('?foo=bar', { ignoreQueryPrefix: true })).toEqual({ foo: 'bar' });
		expect(parse('foo=bar', { ignoreQueryPrefix: true })).toEqual({ foo: 'bar' });
		expect(parse('?foo=bar', { ignoreQueryPrefix: false })).toEqual({ '?foo': 'bar' });
	});

	test('parses an object', function (st) {
		var input = {
			'user[name]': { 'pop[bob]': 3 },
			'user[email]': null,
		};

		var expected = {
			user: {
				name: { 'pop[bob]': 3 },
				email: null,
			},
		};

		// @ts-expect-error
		var result = parse(input);

		expect(result).toEqual(expected);
	});

	test('parses string with comma as array divider', function (st) {
		expect(parse('foo=bar,tee', { comma: true })).toEqual({ foo: ['bar', 'tee'] });
		expect(parse('foo[bar]=coffee,tee', { comma: true })).toEqual({
			foo: { bar: ['coffee', 'tee'] },
		});
		expect(parse('foo=', { comma: true })).toEqual({ foo: '' });
		expect(parse('foo', { comma: true })).toEqual({ foo: '' });
		expect(parse('foo', { comma: true, strictNullHandling: true })).toEqual({ foo: null });

		// test cases inversed from from stringify tests
		expect(parse('a[0]=c')).toEqual({ a: ['c'] });
		expect(parse('a[]=c')).toEqual({ a: ['c'] });
		expect(parse('a[]=c', { comma: true })).toEqual({ a: ['c'] });

		expect(parse('a[0]=c&a[1]=d')).toEqual({ a: ['c', 'd'] });
		expect(parse('a[]=c&a[]=d')).toEqual({ a: ['c', 'd'] });
		expect(parse('a=c,d', { comma: true })).toEqual({ a: ['c', 'd'] });
	});

	test('parses values with comma as array divider', function (st) {
		// @ts-expect-error
		expect(parse({ foo: 'bar,tee' }, { comma: false })).toEqual({ foo: 'bar,tee' });
		// @ts-expect-error
		expect(parse({ foo: 'bar,tee' }, { comma: true })).toEqual({ foo: ['bar', 'tee'] });
	});

	test('use number decoder, parses string that has one number with comma option enabled', function (st) {
		var decoder = function (str: any, defaultDecoder: any, charset: any, type: any) {
			if (!isNaN(Number(str))) {
				return parseFloat(str);
			}
			return defaultDecoder(str, defaultDecoder, charset, type);
		};

		expect(parse('foo=1', { comma: true, decoder: decoder })).toEqual({ foo: 1 });
		expect(parse('foo=0', { comma: true, decoder: decoder })).toEqual({ foo: 0 });
	});

	test('parses brackets holds array of arrays when having two parts of strings with comma as array divider', function (st) {
		// st.deepEqual(parse('foo[]=1,2,3&foo[]=4,5,6', { comma: true }), {
		// 	foo: [
		// 		['1', '2', '3'],
		// 		['4', '5', '6'],
		// 	],
		// });
		// st.deepEqual(parse('foo[]=1,2,3&foo[]=', { comma: true }), { foo: [['1', '2', '3'], ''] });
		// st.deepEqual(parse('foo[]=1,2,3&foo[]=,', { comma: true }), {
		// 	foo: [
		// 		['1', '2', '3'],
		// 		['', ''],
		// 	],
		// });
		// st.deepEqual(parse('foo[]=1,2,3&foo[]=a', { comma: true }), { foo: [['1', '2', '3'], 'a'] });
		expect(parse('foo[]=1,2,3&foo[]=4,5,6', { comma: true })).toEqual({
			foo: [
				['1', '2', '3'],
				['4', '5', '6'],
			],
		});
		expect(parse('foo[]=1,2,3&foo[]=', { comma: true })).toEqual({ foo: [['1', '2', '3'], ''] });
		expect(parse('foo[]=1,2,3&foo[]=,', { comma: true })).toEqual({
			foo: [
				['1', '2', '3'],
				['', ''],
			],
		});
		expect(parse('foo[]=1,2,3&foo[]=a', { comma: true })).toEqual({
			foo: [['1', '2', '3'], 'a'],
		});
	});

	test('parses url-encoded brackets holds array of arrays when having two parts of strings with comma as array divider', function (st) {
		expect(parse('foo%5B%5D=1,2,3&foo%5B%5D=4,5,6', { comma: true })).toEqual({
			foo: [
				['1', '2', '3'],
				['4', '5', '6'],
			],
		});
		expect(parse('foo%5B%5D=1,2,3&foo%5B%5D=', { comma: true })).toEqual({
			foo: [['1', '2', '3'], ''],
		});
		expect(parse('foo%5B%5D=1,2,3&foo%5B%5D=,', { comma: true })).toEqual({
			foo: [
				['1', '2', '3'],
				['', ''],
			],
		});
		expect(parse('foo%5B%5D=1,2,3&foo%5B%5D=a', { comma: true })).toEqual({
			foo: [['1', '2', '3'], 'a'],
		});
	});

	test('parses comma delimited array while having percent-encoded comma treated as normal text', function (st) {
		expect(parse('foo=a%2Cb', { comma: true })).toEqual({ foo: 'a,b' });
		expect(parse('foo=a%2C%20b,d', { comma: true })).toEqual({ foo: ['a, b', 'd'] });
		expect(parse('foo=a%2C%20b,c%2C%20d', { comma: true })).toEqual({ foo: ['a, b', 'c, d'] });
	});

	test('parses an object in dot notation', function (st) {
		var input = {
			'user.name': { 'pop[bob]': 3 },
			'user.email.': null,
		};

		var expected = {
			user: {
				name: { 'pop[bob]': 3 },
				email: null,
			},
		};

		// @ts-expect-error
		var result = parse(input, { allowDots: true });

		expect(result).toEqual(expected);
	});

	test('parses an object and not child values', function (st) {
		var input = {
			'user[name]': { 'pop[bob]': { test: 3 } },
			'user[email]': null,
		};

		var expected = {
			user: {
				name: { 'pop[bob]': { test: 3 } },
				email: null,
			},
		};

		// @ts-expect-error
		var result = parse(input);

		// st.deepEqual(result, expected);
		expect(result).toEqual(expected);
	});

	test('does not crash when parsing circular references', function (st) {
		var a: any = {};
		a.b = a;

		var parsed: any;

		expect(() => {
			// @ts-expect-error
			parsed = parse({ 'foo[bar]': 'baz', 'foo[baz]': a });
		}).not.toThrow();

		expect('foo' in parsed).toBe(true);
		expect('bar' in parsed.foo).toBe(true);
		expect('baz' in parsed.foo).toBe(true);
		expect(parsed.foo.bar).toBe('baz');
		expect(parsed.foo.baz).toEqual(a);
	});

	test('does not crash when parsing deep objects', function (st) {
		var parsed: any;
		var str = 'foo';

		for (var i = 0; i < 5000; i++) {
			str += '[p]';
		}

		str += '=bar';

		expect(() => {
			parsed = parse(str, { depth: 5000 });
		}).not.toThrow();

		expect('foo' in parsed).toBe(true);

		var depth = 0;
		var ref = parsed.foo;
		while ((ref = ref.p)) {
			depth += 1;
		}

		expect(depth).toBe(5000);
	});

	test('parses null objects correctly', { skip: !Object.create }, function (st) {
		var a = Object.create(null);
		a.b = 'c';

		expect(parse(a)).toEqual({ b: 'c' });

		// @ts-expect-error
		var result = parse({ a: a });
		expect('a' in result).toBe(true);
		expect(result.a).toEqual(a);
	});

	test('parses dates correctly', function (st) {
		var now = new Date();

		// @ts-expect-error
		expect(parse({ a: now })).toEqual({ a: now });
	});

	test('parses regular expressions correctly', function (st) {
		var re = /^test$/;

		// @ts-expect-error
		expect(parse({ a: re })).toEqual({ a: re });
	});

	test('does not allow overwriting prototype properties', function (st) {
		expect(parse('a[hasOwnProperty]=b', { allowPrototypes: false })).toEqual({});
		expect(parse('hasOwnProperty=b', { allowPrototypes: false })).toEqual({});

		expect(parse('toString', { allowPrototypes: false })).toEqual({});
	});

	test('can allow overwriting prototype properties', function (st) {
		expect(parse('a[hasOwnProperty]=b', { allowPrototypes: true })).toEqual({
			a: { hasOwnProperty: 'b' },
		});
		expect(parse('hasOwnProperty=b', { allowPrototypes: true })).toEqual({
			hasOwnProperty: 'b',
		});

		expect(parse('toString', { allowPrototypes: true })).toEqual({ toString: '' });
	});

	test('params starting with a closing bracket', function (st) {
		expect(parse(']=toString')).toEqual({ ']': 'toString' });
		expect(parse(']]=toString')).toEqual({ ']]': 'toString' });
		expect(parse(']hello]=toString')).toEqual({ ']hello]': 'toString' });
	});

	test('params starting with a starting bracket', function (st) {
		expect(parse('[=toString')).toEqual({ '[': 'toString' });
		expect(parse('[[=toString')).toEqual({ '[[': 'toString' });
		expect(parse('[hello[=toString')).toEqual({ '[hello[': 'toString' });
	});

	test('add keys to objects', function (st) {
		expect(parse('a[b]=c&a=d')).toEqual({ a: { b: 'c', d: true } });

		expect(parse('a[b]=c&a=toString')).toEqual({ a: { b: 'c' } });

		expect(parse('a[b]=c&a=toString', { allowPrototypes: true })).toEqual({
			a: { b: 'c', toString: true },
		});

		expect(parse('a[b]=c&a=toString', { plainObjects: true })).toEqual({
			__proto__: null,
			a: {
				__proto__: null,
				b: 'c',
				toString: true,
			},
		});
	});

	test('dunder proto is ignored', function (st) {
		var payload = 'categories[__proto__]=login&categories[__proto__]&categories[length]=42';
		var result = parse(payload, { allowPrototypes: true });

		expect(result).toEqual({
			categories: {
				length: '42',
			},
		});

		var plainResult = parse(payload, { allowPrototypes: true, plainObjects: true });

		expect(plainResult).toEqual({
			__proto__: null,
			categories: {
				__proto__: null,
				length: '42',
			},
		});

		var query = parse(
			'categories[__proto__]=cats&categories[__proto__]=dogs&categories[some][json]=toInject',
			{ allowPrototypes: true },
		);

		// st.notOk(Array.isArray(query.categories), 'is not an array');
		assert.isNotOk(Array.isArray(query.categories));
		// st.notOk(query.categories instanceof Array, 'is not instanceof an array');
		assert.isNotOk(query.categories instanceof Array);
		expect(query.categories).toEqual({ some: { json: 'toInject' } });
		expect(JSON.stringify(query.categories)).toEqual('{"some":{"json":"toInject"}}');

		expect(
			parse('foo[__proto__][hidden]=value&foo[bar]=stuffs', { allowPrototypes: true }),
		).toEqual({
			foo: {
				bar: 'stuffs',
			},
		});

		expect(
			parse('foo[__proto__][hidden]=value&foo[bar]=stuffs', {
				allowPrototypes: true,
				plainObjects: true,
			}),
		).toEqual({
			__proto__: null,
			foo: {
				__proto__: null,
				bar: 'stuffs',
			},
		});
	});

	test('can return null objects', { skip: !Object.create }, function (st) {
		var expected = Object.create(null);
		expected.a = Object.create(null);
		expected.a.b = 'c';
		expected.a.hasOwnProperty = 'd';
		// st.deepEqual(parse('a[b]=c&a[hasOwnProperty]=d', { plainObjects: true }), expected);
		// st.deepEqual(parse(null, { plainObjects: true }), Object.create(null));
		expect(parse('a[b]=c&a[hasOwnProperty]=d', { plainObjects: true })).toEqual(expected);
		// @ts-expect-error
		expect(parse(null, { plainObjects: true })).toEqual(Object.create(null));
		var expectedArray = Object.create(null);
		expectedArray.a = Object.create(null);
		expectedArray.a[0] = 'b';
		expectedArray.a.c = 'd';
		// st.deepEqual(parse('a[]=b&a[c]=d', { plainObjects: true }), expectedArray);
		expect(parse('a[]=b&a[c]=d', { plainObjects: true })).toEqual(expectedArray);
	});

	test('can parse with custom encoding', function (st) {
		expect(
			parse('%8c%a7=%91%e5%8d%e3%95%7b', {
				decoder: function (str) {
					var reg = /%([0-9A-F]{2})/gi;
					var result = [];
					var parts = reg.exec(str);
					while (parts) {
						result.push(parseInt(parts[1], 16));
						parts = reg.exec(str);
					}
					return String(iconv.decode(Buffer.from(result), 'shift_jis'));
				},
			}),
		).toEqual({ 県: '大阪府' });
	});

	test('receives the default decoder as a second argument', function (st) {
		parse('a', {
			decoder: function (str, defaultDecoder) {
				expect(defaultDecoder).toBe(decode);
			},
		});
	});

	test('throws error with wrong decoder', function (st) {
		expect(() => {
			// @ts-expect-error
			parse({}, { decoder: 'string' });
		}).toThrow(new TypeError('Decoder has to be a function.'));
	});

	test('does not mutate the options argument', function (st) {
		var options = {};
		parse('a[b]=true', options);

		expect(options).toEqual({});
	});

	test('throws if an invalid charset is specified', function (st) {
		expect(() => {
			// @ts-expect-error
			parse('a=b', { charset: 'foobar' });
		}).toThrow(new TypeError('The charset option must be either utf-8, iso-8859-1, or undefined'));
	});

	test('parses an iso-8859-1 string if asked to', function (st) {
		expect(parse('%A2=%BD', { charset: 'iso-8859-1' })).toEqual({ '¢': '½' });
	});

	var urlEncodedCheckmarkInUtf8 = '%E2%9C%93';
	var urlEncodedOSlashInUtf8 = '%C3%B8';
	var urlEncodedNumCheckmark = '%26%2310003%3B';
	var urlEncodedNumSmiley = '%26%239786%3B';

	test('prefers an utf-8 charset specified by the utf8 sentinel to a default charset of iso-8859-1', function (st) {
		expect(
			parse(
				'utf8=' +
					urlEncodedCheckmarkInUtf8 +
					'&' +
					urlEncodedOSlashInUtf8 +
					'=' +
					urlEncodedOSlashInUtf8,
				{ charsetSentinel: true, charset: 'iso-8859-1' },
			),
		).toEqual({ ø: 'ø' });
	});

	test('prefers an iso-8859-1 charset specified by the utf8 sentinel to a default charset of utf-8', function (st) {
		expect(
			parse(
				'utf8=' +
					urlEncodedNumCheckmark +
					'&' +
					urlEncodedOSlashInUtf8 +
					'=' +
					urlEncodedOSlashInUtf8,
				{ charsetSentinel: true, charset: 'utf-8' },
			),
		).toEqual({ 'Ã¸': 'Ã¸' });
	});

	test('does not require the utf8 sentinel to be defined before the parameters whose decoding it affects', function (st) {
		expect(
			parse('a=' + urlEncodedOSlashInUtf8 + '&utf8=' + urlEncodedNumCheckmark, {
				charsetSentinel: true,
				charset: 'utf-8',
			}),
		).toEqual({ a: 'Ã¸' });
	});

	test('should ignore an utf8 sentinel with an unknown value', function (st) {
		expect(
			parse('utf8=foo&' + urlEncodedOSlashInUtf8 + '=' + urlEncodedOSlashInUtf8, {
				charsetSentinel: true,
				charset: 'utf-8',
			}),
		).toEqual({ ø: 'ø' });
	});

	test('uses the utf8 sentinel to switch to utf-8 when no default charset is given', function (st) {
		expect(
			parse(
				'utf8=' +
					urlEncodedCheckmarkInUtf8 +
					'&' +
					urlEncodedOSlashInUtf8 +
					'=' +
					urlEncodedOSlashInUtf8,
				{ charsetSentinel: true },
			),
		).toEqual({ ø: 'ø' });
	});

	test('uses the utf8 sentinel to switch to iso-8859-1 when no default charset is given', function (st) {
		expect(
			parse(
				'utf8=' +
					urlEncodedNumCheckmark +
					'&' +
					urlEncodedOSlashInUtf8 +
					'=' +
					urlEncodedOSlashInUtf8,
				{ charsetSentinel: true },
			),
		).toEqual({ 'Ã¸': 'Ã¸' });
	});

	test('interprets numeric entities in iso-8859-1 when `interpretNumericEntities`', function (st) {
		expect(
			parse('foo=' + urlEncodedNumSmiley, {
				charset: 'iso-8859-1',
				interpretNumericEntities: true,
			}),
		).toEqual({ foo: '☺' });
	});

	test('handles a custom decoder returning `null`, in the `iso-8859-1` charset, when `interpretNumericEntities`', function (st) {
		expect(
			parse('foo=&bar=' + urlEncodedNumSmiley, {
				charset: 'iso-8859-1',
				decoder: function (str, defaultDecoder, charset) {
					return str ? defaultDecoder(str, defaultDecoder, charset) : null;
				},
				interpretNumericEntities: true,
			}),
		).toEqual({ foo: null, bar: '☺' });
	});

	test('does not interpret numeric entities in iso-8859-1 when `interpretNumericEntities` is absent', function (st) {
		expect(parse('foo=' + urlEncodedNumSmiley, { charset: 'iso-8859-1' })).toEqual({
			foo: '&#9786;',
		});
	});

	test('does not interpret numeric entities when the charset is utf-8, even when `interpretNumericEntities`', function (st) {
		expect(
			parse('foo=' + urlEncodedNumSmiley, { charset: 'utf-8', interpretNumericEntities: true }),
		).toEqual({
			foo: '&#9786;',
		});
	});

	test('does not interpret %uXXXX syntax in iso-8859-1 mode', function (st) {
		expect(parse('%u263A=%u263A', { charset: 'iso-8859-1' })).toEqual({ '%u263A': '%u263A' });
	});

	test('allows for decoding keys and values differently', function (st) {
		// @ts-expect-error
		var decoder = function (str, defaultDecoder, charset, type) {
			if (type === 'key') {
				return defaultDecoder(str, defaultDecoder, charset, type).toLowerCase();
			}
			if (type === 'value') {
				return defaultDecoder(str, defaultDecoder, charset, type).toUpperCase();
			}
			throw 'this should never happen! type: ' + type;
		};

		expect(parse('KeY=vAlUe', { decoder: decoder })).toEqual({ key: 'VALUE' });
	});
});

describe('parses empty keys', function (t) {
	empty_test_cases.forEach(function (testCase) {
		test('skips empty string key with ' + testCase.input, function (st) {
			expect(parse(testCase.input)).toEqual(testCase.no_empty_keys);
		});
	});
});

test('`duplicates` option', function (t) {
	const non_strings = ([] as any[]).concat(
		[undefined, null],
		[true, false],
		[0, -0].concat([42], [Infinity, -Infinity], [-1.3, 0.2, 1.8, 1 / 3]),
		([] as any).concat(Symbol.iterator, Symbol('foo'), []),
		[
			{},
			{
				valueOf: function () {
					return 3;
				},
				toString: function () {
					return 42;
				},
			},
			{
				valueOf: function () {
					return function valueOfFn() {};
				},
				toString: function () {
					return 42;
				},
			},
			{
				valueOf: function () {
					return {};
				},
				toString: function () {
					return 7;
				},
			},
			{
				valueOf: function () {
					return 4;
				},
				toString: function () {
					return {};
				},
			},
		],
		[BigInt(42), BigInt(0)],
	);
	non_strings.concat('not a valid option').forEach(function (invalidOption) {
		if (typeof invalidOption !== 'undefined') {
			expect(() => {
				parse('', { duplicates: invalidOption });
			}).toThrow(TypeError);
		}
	});

	// deepEqual(parse('foo=bar&foo=baz'), { foo: ['bar', 'baz'] }, 'duplicates: default, combine');
	expect(parse('foo=bar&foo=baz')).toEqual({ foo: ['bar', 'baz'] });

	// deepEqual(
	// 	parse('foo=bar&foo=baz', { duplicates: 'combine' }),
	// 	{ foo: ['bar', 'baz'] },
	// 	'duplicates: combine',
	// );
	expect(parse('foo=bar&foo=baz', { duplicates: 'combine' })).toEqual({ foo: ['bar', 'baz'] });

	// deepEqual(
	// 	parse('foo=bar&foo=baz', { duplicates: 'first' }),
	// 	{ foo: 'bar' },
	// 	'duplicates: first',
	// );
	expect(parse('foo=bar&foo=baz', { duplicates: 'first' })).toEqual({ foo: 'bar' });

	// deepEqual(
	// 	parse('foo=bar&foo=baz', { duplicates: 'last' }),
	// 	{ foo: 'baz' },
	// 	'duplicates: last',
	// );
	expect(parse('foo=bar&foo=baz', { duplicates: 'last' })).toEqual({ foo: 'baz' });
});

describe('qs strictDepth option - throw cases', function (t) {
	test('throws an exception when depth exceeds the limit with strictDepth: true', function () {
		expect(() => {
			parse('a[b][c][d][e][f][g][h][i]=j', { depth: 1, strictDepth: true });
		}).toThrowError(RangeError);
	});

	test('throws an exception for multiple nested arrays with strictDepth: true', function () {
		expect(() => {
			parse('a[0][1][2][3][4]=b', { depth: 3, strictDepth: true });
		}).toThrowError(RangeError);
	});

	test('throws an exception for nested objects and arrays with strictDepth: true', function (st) {
		expect(() => {
			parse('a[b][c][0][d][e]=f', { depth: 3, strictDepth: true });
		}).toThrowError(RangeError);
	});

	test('throws an exception for different types of values with strictDepth: true', function (st) {
		expect(() => {
			parse('a[b][c][d][e]=true&a[b][c][d][f]=42', { depth: 3, strictDepth: true });
		}).toThrowError(RangeError);
	});
});

describe('qs strictDepth option - non-throw cases', function (t) {
	test('when depth is 0 and strictDepth true, do not throw', function (st) {
		expect(() => {
			parse('a[b][c][d][e]=true&a[b][c][d][f]=42', { depth: 0, strictDepth: true });
		}).not.toThrow();
	});

	test('parses successfully when depth is within the limit with strictDepth: true', function (st) {
		expect(() => {
			parse('a[b]=c', { depth: 1, strictDepth: true });
		}).not.toThrow();
	});

	test('does not throw an exception when depth exceeds the limit with strictDepth: false', function (st) {
		expect(() => {
			const result = parse('a[b][c][d][e][f][g][h][i]=j', { depth: 1 });
			expect(result).toEqual({ a: { b: { '[c][d][e][f][g][h][i]': 'j' } } });
		}).not.toThrow();
	});

	test('parses successfully when depth is within the limit with strictDepth: false', function (st) {
		expect(() => {
			const result = parse('a[b]=c', { depth: 1 });
			expect(result).toEqual({ a: { b: 'c' } });
		}).not.toThrow();
	});

	test('does not throw when depth is exactly at the limit with strictDepth: true', function (st) {
		expect(() => {
			const result = parse('a[b][c]=d', { depth: 2, strictDepth: true });
			expect(result).toEqual({ a: { b: { c: 'd' } } });
		}).not.toThrow();
	});
});
