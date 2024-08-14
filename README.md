# neoqs

A querystring parsing and stringifying library with some added security. It is a fork and TypeScript rewrite of [qs](https://github.com/ljharb/qs) that aims to be modern, lightweight yet fully backwards compatible with `qs`.

Lead Maintainer: [Puru Vijay](https://github.com/puruvj)

The **qs** module was originally created and maintained by [TJ Holowaychuk](https://github.com/visionmedia/node-querystring).

`neoqs` is not endorsed by the current maintainer of `qs`.

---

- 🤌 3.9KB min+brotli (3x smaller than `qs`)
- 🚥 Zero dependencies
- 🎹 TypeScript. Throw away the `@types/qs` package
- ❎ No polyfills
- 🛸 ESM-first
- 📜 Legacy mode supporting ES5

Rules this package aims to follow for an indefinite period of time:

- No dependencies.
- No polyfills.
- ESM-first.
- Pushing to be modern
- Always provide a legacy mode
- Always follow `qs` API. There already are many packages that do this. `neoqs` intends to be a drop-in replacement for `qs` and provide the same API with 0 dependencies and enhanced Developer Experience.

# When to use this package?

This package is intended to be a drop-in replacement for `qs` and provide the same API with 0 dependencies and enhanced Developer Experience. Hence, if you are already using `qs` in your project, you should use this package instead.

## When \*not\* to use this package?

If your use-cases are very simple(`foo=bar&baz=baka`), mostly top-level keys(`foo=bar`), and not supporting really old browsers and Node versions, delete both `qs` and `neoqs` from your project and use [URLSearchParams](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams) instead.

# Which build to use?

`neoqs` provides 2 builds:

- default: Backwards compatible with `qs` and provides the same API, but ESM only and compiled to ES2022 with Node 18+
- legacy: Legacy build with ES5 and CommonJS, compatible with `qs` and provides the same API. _Theoretically_ works as far back as Node 4.0.0, but it's not tested.

Here's a matrix of the different builds:

| Build   | ESM       | CJS | Browser | Node | Polyfills | Size             |
| ------- | --------- | --- | ------- | ---- | --------- | ---------------- |
| default | ✅ ES2022 |     | ✅      | ✅   | ❌        | 3.9KB min+brotli |
| legacy  | ✅ ES5    | ✅  | ✅      | ✅   | ❌        | 4.2KB min+brotli |

If you:

### are shipping a library with commonJS support:

Use `legacy` build for compatibility with old browsers and Node versions.

```js
const { parse, stringify } = require('neoqs/legacy');
```

ESM:

```js
import { parse, stringify } from 'neoqs/legacy';
```

### don't care about old browsers or Node versions:

Use default build for no breaking changes, and a modern build for better developer experience.

```ts
import * as qs from 'neoqs';

const obj = qs.parse('a=c');
console.log(obj);

const str = qs.stringify(obj);
console.log(str);
```

### and you care about old browsers or Node or CommonJS versions:

Use legacy build for compatibility with old browsers and Node versions.

```js
const { parse, stringify } = require('neoqs/legacy');
```

ESM:

```js
import { parse, stringify } from 'neoqs/legacy';
```

## Usage

```js
import * as qs from 'neoqs';

const obj = qs.parse('a=c');
console.log(obj);

const str = qs.stringify(obj);
console.log(str);
```

### Parsing Objects

[](#preventEval)

```js
parse(string, [options]);
```

**qs** allows you to create nested objects within your query strings, by surrounding the name of sub-keys with square brackets `[]`. For example, the string `'foo[bar]=baz'` converts to:

```js
console.log(qs.parse('foo[bar]=baz'));
// Output:
// {
//  foo: {
//    bar: 'baz'
//  }
//});
```

When using the `plainObjects` option the parsed value is returned as a null object, created via `Object.create(null)` and as such you should be aware that prototype methods will not exist on it and a user may set those names to whatever value they like:

```js
const nullObject = qs.parse('a[hasOwnProperty]=b', { plainObjects: true });
console.log(nullObject);
// Output:
// {
//  a: {
//    hasOwnProperty: 'b'
//  }
// }
```

By default parameters that would overwrite properties on the object prototype are ignored, if you wish to keep the data from those fields either use `plainObjects` as mentioned above, or set `allowPrototypes` to `true` which will allow user input to overwrite those properties. _WARNING_ It is generally a bad idea to enable this option as it can cause problems when attempting to use the properties that have been overwritten. Always be careful with this option.

```js
const protoObject = qs.parse('a[hasOwnProperty]=b', { allowPrototypes: true });
console.log(protoObject);
// Output:
// {
//  a: {
//    hasOwnProperty: 'b'
//  }
// }
```

URI encoded strings work too:

```js
console.log(qs.parse('a%5Bb%5D=c'));
// Output:
// {
//  a: {
//    b: 'c'
//  }
// }
```

You can also nest your objects, like `'foo[bar][baz]=foobarbaz'`:

```js
console.log(qs.parse('foo[bar][baz]=foobarbaz'));
// Output:
// {
//  foo: {
//    bar: {
//      baz: 'foobarbaz'
//    }
//  }
// }
```

By default, when nesting objects **qs** will only parse up to 5 children deep. This means if you attempt to parse a string like `'a[b][c][d][e][f][g][h][i]=j'` your resulting object will be:

```js
const expected = {
  a: {
    b: {
      c: {
        d: {
          e: {
            f: {
              '[g][h][i]': 'j'
            }
          }
        }
      }
    }
  }
};
console.log(qs.stringify(expected));
// Output:
// 'a[b][c][d][e][f][g][h][i]=j'
```

This depth can be overridden by passing a `depth` option to `qs.parse(string, [options])`:

```js
const deep = qs.parse('a[b][c][d][e][f][g][h][i]=j', { depth: 1 });
console.log(deep);
// Output:
// {
//  a: {
//    b: {
//      '[c][d][e][f][g][h][i]': 'j'
//    }
//  }
// }
```

You can configure **qs** to throw an error when parsing nested input beyond this depth using the `strictDepth` option (defaulted to false):

```js
try {
  qs.parse('a[b][c][d][e][f][g][h][i]=j', { depth: 1, strictDepth: true });
} catch (err) {
  assert(err instanceof RangeError);
  assert.strictEqual(err.message, 'Input depth exceeded depth option of 1 and strictDepth is true');
}
```

The depth limit helps mitigate abuse when **qs** is used to parse user input, and it is recommended to keep it a reasonably small number. The strictDepth option adds a layer of protection by throwing an error when the limit is exceeded, allowing you to catch and handle such cases.

For similar reasons, by default **qs** will only parse up to 1000 parameters. This can be overridden by passing a `parameterLimit` option:

```js
const limited = qs.parse('a=b&c=d', { parameterLimit: 1 });
console.log(limited);
// Output:
// {
//  a: 'b'
// }
```

To bypass the leading question mark, use `ignoreQueryPrefix`:

```js
const prefixed = qs.parse('?a=b&c=d', { ignoreQueryPrefix: true });
console.log(prefixed);
// Output:
// {
//  a: 'b',
//  c: 'd'
// }
```

An optional delimiter can also be passed:

```js
const delimited = qs.parse('a=b;c=d', { delimiter: ';' });
console.log(delimited);
// Output:
// {
//  a: 'b',
//  c: 'd'
// }
```

Delimiters can be a regular expression too:

```js
const regexed = qs.parse('a=b;c=d,e=f', { delimiter: /[;,]/ });
console.log(regexed);
// Output:
// {
//  a: 'b',
//  c: 'd',
//  e: 'f'
// }
```

Option `allowDots` can be used to enable dot notation:

```js
const withDots = qs.parse('a.b=c', { allowDots: true });
console.log(withDots);
// Output:
// {
//  a: {
//    b: 'c'
//  }
// }
```

Option `decodeDotInKeys` can be used to decode dots in keys Note: it implies `allowDots`, so `parse` will error if you set `decodeDotInKeys` to `true`, and `allowDots` to `false`.

```js
const withDots = qs.parse('name%252Eobj.first=John&name%252Eobj.last=Doe', {
  decodeDotInKeys: true
});
console.log(withDots);
// Output:
// {
//  'name.obj': {
//    first: 'John',
//    last: 'Doe'
//  }
// }
```

Option `allowEmptyArrays` can be used to allowing empty array values in object

```js
const withEmptyArrays = qs.parse('foo[]&bar=baz', { allowEmptyArrays: true });
console.log(withEmptyArrays);
// Output:
// {
//  foo: [],
//  bar: 'baz'
// }
```

Option `duplicates` can be used to change the behavior when duplicate keys are encountered

```js
console.log(qs.parse('foo=bar&foo=baz', { duplicates: 'combine' }));
// Output:
// {
//  foo: ['bar', 'baz']
// }

console.log(qs.parse('foo=bar&foo=baz', { duplicates: 'first' }));
// Output:
// {
//  foo: 'bar'
// }

console.log(qs.parse('foo=bar&foo=baz', { duplicates: 'last' }));
// Output:
// {
//  foo: 'baz'
// }

console.log(qs.parse('foo=bar&foo=baz', { duplicates: 'replace' }));
// Output:
// {
//  foo: 'bar'
// }
```

If you have to deal with legacy browsers or services, there's also support for decoding percent-encoded octets as iso-8859-1:

```js
const oldCharset = qs.parse('a=%A7', { charset: 'iso-8859-1' });
console.log(oldCharset);
// Output:
// {
//  a: '§'
// }
```

Some services add an initial `utf8=✓` value to forms so that old Internet Explorer versions are more likely to submit the form as utf-8. Additionally, the server can check the value against wrong encodings of the checkmark character and detect that a query string or `application/x-www-form-urlencoded` body was _not_ sent as utf-8, eg. if the form had an `accept-charset` parameter or the containing page had a different character set.

**qs** supports this mechanism via the `charsetSentinel` option. If specified, the `utf8` parameter will be omitted from the returned object. It will be used to switch to `iso-8859-1`/`utf-8` mode depending on how the checkmark is encoded.

**Important**: When you specify both the `charset` option and the `charsetSentinel` option, the `charset` will be overridden when the request contains a `utf8` parameter from which the actual charset can be deduced. In that sense the `charset` will behave as the default charset rather than the authoritative charset.

```js
const detectedAsUtf8 = qs.parse('utf8=%E2%9C%93&a=%C3%B8', {
  charset: 'iso-8859-1',
  charsetSentinel: true
});
console.log(detectedAsUtf8);
// Output:
// {
//  a: 'ø'
// }

// Browsers encode the checkmark as &#10003; when submitting as iso-8859-1:
const detectedAsIso8859_1 = qs.parse('utf8=%26%2310003%3B&a=%F8', {
  charset: 'utf-8',
  charsetSentinel: true
});
console.log(detectedAsIso8859_1);
// Output:
// {
//  a: 'ø'
// }
```

If you want to decode the `&#...;` syntax to the actual character, you can specify the `interpretNumericEntities` option as well:

```js
const detectedAsIso8859_1 = qs.parse('a=%26%239786%3B', {
  charset: 'iso-8859-1',
  interpretNumericEntities: true
});
console.log(detectedAsIso8859_1);
// Output: {
//  a: '☺'
// }
```

It also works when the charset has been detected in `charsetSentinel` mode.

### Parsing Arrays

**qs** can also parse arrays using a similar `[]` notation:

```js
const withArray = qs.parse('a[]=b&a[]=c');
console.log(withArray);
// Output:
// {
//  a: ['b', 'c']
// }
```

You may specify an index as well:

```js
const withIndexes = qs.parse('a[1]=c&a[0]=b');
console.log(withIndexes);
// Output:
// {
//  a: ['b', 'c']
// }
```

Note that the only difference between an index in an array and a key in an object is that the value between the brackets must be a number to create an array. When creating arrays with specific indices, **qs** will compact a sparse array to only the existing values preserving their order:

```js
const noSparse = qs.parse('a[1]=b&a[15]=c');
console.log(noSparse);
// Output:
// {
//  a: ['b', 'c']
// }
```

You may also use `allowSparse` option to parse sparse arrays:

```js
const sparseArray = qs.parse('a[1]=2&a[3]=5', { allowSparse: true });
console.log(sparseArray);
// Output:
// {
//  a: [, '2', , '5']
// }
```

Note that an empty string is also a value, and will be preserved:

```js
const withEmptyString = qs.parse('a[]=&a[]=b');
console.log(withEmptyString);
// Output:
// {
//  a: ['', 'b']
// }

const withIndexedEmptyString = qs.parse('a[0]=b&a[1]=&a[2]=c');
console.log(withIndexedEmptyString);
// Output:
// {
//  a: ['b', '', 'c']
// }
```

**qs** will also limit specifying indices in an array to a maximum index of `20`. Any array members with an index of greater than `20` will instead be converted to an object with the index as the key. This is needed to handle cases when someone sent, for example, `a[999999999]` and it will take significant time to iterate over this huge array.

```js
const withMaxIndex = qs.parse('a[100]=b');
console.log(withMaxIndex);
// Output:
// {
//  a: {
//    100: 'b'
//  }
// }
```

This limit can be overridden by passing an `arrayLimit` option:

```js
const withArrayLimit = qs.parse('a[1]=b', { arrayLimit: 0 });
console.log(withArrayLimit);
// Output:
// {
//  a: {
//    1: 'b'
//  }
// }
```

To disable array parsing entirely, set `parseArrays` to `false`.

```js
const noParsingArrays = qs.parse('a[]=b', { parseArrays: false });
console.log(noParsingArrays);
// Output:
// {
//  a: {
//    0: 'b'
//  }
// }
```

If you mix notations, **qs** will merge the two items into an object:

```js
const mixedNotation = qs.parse('a[0]=b&a[b]=c');
console.log(mixedNotation);
// Output:
// {
//  a: {
//    0: 'b',
//    b: 'c'
//  }
// }
```

You can also create arrays of objects:

```js
const arraysOfObjects = qs.parse('a[][b]=c');
console.log(arraysOfObjects);
// Output:
// {
//  a: [{ b: 'c' }]
// }
```

Some people use comma to join array, **qs** can parse it:

```js
const arraysOfObjects = qs.parse('a=b,c', { comma: true });
console.log(arraysOfObjects);
// Output:
// {
//  a: ['b', 'c']
// }
```

(_this cannot convert nested objects, such as `a={b:1},{c:d}`_)

### Parsing primitive/scalar values (numbers, booleans, null, etc)

By default, all values are parsed as strings. This behavior will not change and is explained in [issue #91](https://github.com/ljharb/qs/issues/91).

```js
const primitiveValues = qs.parse('a=15&b=true&c=null');
console.log(primitiveValues);
// Output:
// {
//  a: '15',
//  b: 'true',
//  c: 'null'
// }
```

If you wish to auto-convert values which look like numbers, booleans, and other values into their primitive counterparts, you can use the [query-types Express JS middleware](https://github.com/xpepermint/query-types) which will auto-convert all request query parameters.

### Stringifying

[](#preventEval)

```js
qs.stringify(object, [options]);
```

When stringifying, **qs** by default URI encodes output. Objects are stringified as you would expect:

```js
console.log(qs.stringify({ a: 'b' }));
// Output:
// a=b

console.log(qs.stringify({ a: { b: 'c' } }));
// Output:
// a%5Bb%5D=c
```

This encoding can be disabled by setting the `encode` option to `false`:

```js
const unencoded = qs.stringify({ a: { b: 'c' } }, { encode: false });
console.log(unencoded);
// Output:
// a[b]=c
```

Encoding can be disabled for keys by setting the `encodeValuesOnly` option to `true`:

```js
const encodedValues = qs.stringify(
  { a: 'b', c: ['d', 'e=f'], f: [['g'], ['h']] },
  { encodeValuesOnly: true }
);
console.log(encodedValues);
// Output:
// a=b&c[0]=d&c[1]=e%3Df&f[0][0]=g&f[1][0]=h
```

This encoding can also be replaced by a custom encoding method set as `encoder` option:

```js
const encoded = qs.stringify(
  { a: { b: 'c' } },
  {
    encoder: function (str) {
      // Passed in values `a`, `b`, `c`
      return; // Return encoded string
    }
  }
);
```

_(Note: the `encoder` option does not apply if `encode` is `false`)_

Analogue to the `encoder` there is a `decoder` option for `parse` to override decoding of properties and values:

```js
const decoded = qs.parse('x=z', {
  decoder: function (str) {
    // Passed in values `x`, `z`
    return; // Return decoded string
  }
});
```

You can encode keys and values using different logic by using the type argument provided to the encoder:

```js
const encoded = qs.stringify(
  { a: { b: 'c' } },
  {
    encoder: function (str, defaultEncoder, charset, type) {
      if (type === 'key') {
        return; // Encoded key
      } else if (type === 'value') {
        return; // Encoded value
      }
    }
  }
);
```

The type argument is also provided to the decoder:

```js
const decoded = qs.parse('x=z', {
  decoder: function (str, defaultDecoder, charset, type) {
    if (type === 'key') {
      return; // Decoded key
    } else if (type === 'value') {
      return; // Decoded value
    }
  }
});
```

Examples beyond this point will be shown as though the output is not URI encoded for clarity. Please note that the return values in these cases _will_ be URI encoded during real usage.

When arrays are stringified, they follow the `arrayFormat` option, which defaults to `indices`:

```js
qs.stringify({ a: ['b', 'c', 'd'] });
// Output: 'a[0]=b&a[1]=c&a[2]=d'
```

You may override this by setting the `indices` option to `false`, or to be more explicit, the `arrayFormat` option to `repeat`:

```js
qs.stringify({ a: ['b', 'c', 'd'] }, { indices: false });
// Output: 'a=b&a=c&a=d'
```

You may use the `arrayFormat` option to specify the format of the output array:

```js
qs.stringify({ a: ['b', 'c'] }, { arrayFormat: 'indices' });
// Output:'a[0]=b&a[1]=c'
qs.stringify({ a: ['b', 'c'] }, { arrayFormat: 'brackets' });
// Output: 'a[]=b&a[]=c'
qs.stringify({ a: ['b', 'c'] }, { arrayFormat: 'repeat' });
// Output: 'a=b&a=c'
qs.stringify({ a: ['b', 'c'] }, { arrayFormat: 'comma' });
// Output: 'a=b,c'
```

Note: when using `arrayFormat` set to `'comma'`, you can also pass the `commaRoundTrip` option set to `true` or `false`, to append `[]` on single-item arrays, so that they can round trip through a parse.

When objects are stringified, by default they use bracket notation:

```js
qs.stringify({ a: { b: { c: 'd', e: 'f' } } });
// Output: 'a[b][c]=d&a[b][e]=f'
```

You may override this to use dot notation by setting the `allowDots` option to `true`:

```js
qs.stringify({ a: { b: { c: 'd', e: 'f' } } }, { allowDots: true });
// Output: 'a.b.c=d&a.b.e=f'
```

You may encode the dot notation in the keys of object with option `encodeDotInKeys` by setting it to `true`: Note: it implies `allowDots`, so `stringify` will error if you set `decodeDotInKeys` to `true`, and `allowDots` to `false`. Caveat: when `encodeValuesOnly` is `true` as well as `encodeDotInKeys`, only dots in keys and nothing else will be encoded.

```js
qs.stringify(
  { 'name.obj': { first: 'John', last: 'Doe' } },
  { allowDots: true, encodeDotInKeys: true }
);
// Output: 'name%252Eobj.first=John&name%252Eobj.last=Doe'
```

You may allow empty array values by setting the `allowEmptyArrays` option to `true`:

```js
qs.stringify({ foo: [], bar: 'baz' }, { allowEmptyArrays: true });
// Output: 'foo[]&bar=baz'
```

Empty strings and null values will omit the value, but the equals sign (=) remains in place:

```js
console.log(qs.stringify({ a: '' }));
// Output:
// a=
```

Key with no values (such as an empty object or array) will return nothing:

```js
// assert.equal(qs.stringify({ a: [] }), '');
// assert.equal(qs.stringify({ a: {} }), '');
// assert.equal(qs.stringify({ a: [{}] }), '');
// assert.equal(qs.stringify({ a: { b: [] } }), '');
// assert.equal(qs.stringify({ a: { b: {} } }), '');
console.log(qs.stringify({ a: [] }));
// Output:
// ''

console.log(qs.stringify({ a: {} }));
// Output:
// ''

console.log(qs.stringify({ a: [{}] }));
// Output:
// ''

console.log(qs.stringify({ a: { b: [] } }));
// Output:
// ''

console.log(qs.stringify({ a: { b: {} } }));
// Output:
// ''
```

Properties that are set to `undefined` will be omitted entirely:

```js
console.log(qs.stringify({ a: null, b: undefined }));
// Output:
// a=
```

The query string may optionally be prepended with a question mark:

```js
console.log(qs.stringify({ a: 'b', c: 'd' }, { addQueryPrefix: true }));
// Output:
// ?a=b&c=d
```

The delimiter may be overridden with stringify as well:

```js
console.log(qs.stringify({ a: 'b', c: 'd' }, { delimiter: ';' }));
// Output:
// a=b;c=d
```

If you only want to override the serialization of `Date` objects, you can provide a `serializeDate` option:

```js
const date = new Date(7);
console.log(qs.stringify({ a: date }));
// Output:
// a=1970-01-01T00:00:00.007Z

console.log(
  qs.stringify(
    { a: date },
    {
      serializeDate: function (d) {
        return d.getTime();
      }
    }
  )
);
// Output:
// a=7
```

You may use the `sort` option to affect the order of parameter keys:

```js
function alphabeticalSort(a, b) {
  return a.localeCompare(b);
}
console.log(qs.stringify({ a: 'c', z: 'y', b: 'f' }, { sort: alphabeticalSort }));
// Output:
// a=c&b=f&z=y
```

Finally, you can use the `filter` option to restrict which keys will be included in the stringified output. If you pass a function, it will be called for each key to obtain the replacement value. Otherwise, if you pass an array, it will be used to select properties and array indices for stringification:

```js
function filterFunc(prefix, value) {
  if (prefix == 'b') {
    // Return an `undefined` value to omit a property.
    return;
  }
  if (prefix == 'e[f]') {
    return value.getTime();
  }
  if (prefix == 'e[g][0]') {
    return value * 2;
  }
  return value;
}
qs.stringify({ a: 'b', c: 'd', e: { f: new Date(123), g: [2] } }, { filter: filterFunc });
// 'a=b&c=d&e[f]=123&e[g][0]=4'
qs.stringify({ a: 'b', c: 'd', e: 'f' }, { filter: ['a', 'e'] });
// 'a=b&e=f'
qs.stringify({ a: ['b', 'c', 'd'], e: 'f' }, { filter: ['a', 0, 2] });
// 'a[0]=b&a[2]=d'
```

You could also use `filter` to inject custom serialization for user defined types. Consider you're working with some api that expects query strings of the format for ranges:

```
https://domain.com/endpoint?range=30...70
```

For which you model as:

```js
class Range {
  constructor(from, to) {
    this.from = from;
    this.to = to;
  }
}
```

You could _inject_ a custom serializer to handle values of this type:

```js
qs.stringify(
  {
    range: new Range(30, 70)
  },
  {
    filter: (prefix, value) => {
      if (value instanceof Range) {
        return `${value.from}...${value.to}`;
      }
      // serialize the usual way
      return value;
    }
  }
);
// range=30...70
```

### Handling of `null` values

By default, `null` values are treated like empty strings:

```js
const withNull = qs.stringify({ a: null, b: '' });
console.log(withNull);
// Output:
// a=&b=1
```

Parsing does not distinguish between parameters with and without equal signs. Both are converted to empty strings.

```js
const equalsInsensitive = qs.parse('a&b=');
console.log(equalsInsensitive);
// Output:
// {
//  a: '',
//  b: ''
// }
```

To distinguish between `null` values and empty strings use the `strictNullHandling` flag. In the result string the `null` values have no `=` sign:

```js
const strictNull = qs.stringify({ a: null, b: '' }, { strictNullHandling: true });
console.log(strictNull);
// Output:
// a&b=
```

To parse values without `=` back to `null` use the `strictNullHandling` flag:

```js
const parsedStrictNull = qs.parse('a&b=', { strictNullHandling: true });
console.log(parsedStrictNull);
// Output:
// {
//  a: null,
//  b: ''
// }
```

To completely skip rendering keys with `null` values, use the `skipNulls` flag:

```js
const nullsSkipped = qs.stringify({ a: 'b', c: null }, { skipNulls: true });
console.log(nullsSkipped);
// Output:
// a=b
```

If you're communicating with legacy systems, you can switch to `iso-8859-1` using the `charset` option:

```js
const iso = qs.stringify({ æ: 'æ' }, { charset: 'iso-8859-1' });
console.log(iso);
// Output:
// %E6=%E6
```

Characters that don't exist in `iso-8859-1` will be converted to numeric entities, similar to what browsers do:

```js
const numeric = qs.stringify({ a: '☺' }, { charset: 'iso-8859-1' });
console.log(numeric);
// Output:
// a=%26%239786%3B
```

You can use the `charsetSentinel` option to announce the character by including an `utf8=✓` parameter with the proper encoding if the checkmark, similar to what Ruby on Rails and others do when submitting forms.

```js
const sentinel = qs.stringify({ a: '☺' }, { charsetSentinel: true });
console.log(sentinel);
// Output:
// utf8=%E2%9C%93&a=%E2%98%BA

const isoSentinel = qs.stringify({ a: 'æ' }, { charsetSentinel: true, charset: 'iso-8859-1' });
console.log(isoSentinel);
// Output:
// utf8=%26%2310003%3B&a=%E6
```

### Dealing with special character sets

By default the encoding and decoding of characters is done in `utf-8`, and `iso-8859-1` support is also built in via the `charset` parameter.

If you wish to encode querystrings to a different character set (i.e. [Shift JIS](https://en.wikipedia.org/wiki/Shift_JIS)) you can use the [`qs-iconv`](https://github.com/martinheidegger/qs-iconv) library:

```js
import qsEnvEncoder from 'qs-iconv/encoder';

const encoder = qsEnvEncoder('shift_jis');
const shiftJISEncoded = qs.stringify({ a: 'こんにちは！' }, { encoder: encoder });
console.log(shiftJISEncoded);
// Output:
// a=%82%B1%82%F1%82%C9%82%BF%82%CD%81I
```

This also works for decoding of query strings:

```js
import qsEnvDecoder from 'qs-iconv/decoder';

const decoder = qsEnvDecoder('shift_jis');
const obj = qs.parse('a=%82%B1%82%F1%82%C9%82%BF%82%CD%81I', { decoder: decoder });

console.log(obj);
// Output:
// {
//  a: 'こんにちは！'
// }
```

### RFC 3986 and RFC 1738 space encoding

RFC3986 used as default option and encodes ' ' to _%20_ which is backward compatible. In the same time, output can be stringified as per RFC1738 with ' ' equal to '+'.

```js
console.log(qs.stringify({ a: 'b c' }));
// Output:
// a=b%20c

console.log(qs.stringify({ a: 'b c' }, { format: 'RFC3986' }));
// Output:
// a=b%20c

console.log(qs.stringify({ a: 'b c' }, { format: 'RFC1738' }));
// Output:
// a=b+c
```

## Security

Please DM [@puruvjdev](https://twitter.com/puruvjdev) if you have a potential security vulnerability to report.
