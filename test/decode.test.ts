import { Type as t } from 'typebox'
import { Compile } from 'typebox/compile'
import { Value } from 'typebox/value'

import { describe, expect, it } from 'bun:test'

import { createMirror } from '../src'

// string -> number codec; base ~kind is String, ~codec is non-enumerable
const StringToNumber = t
	.Codec(t.String())
	.Decode((v: string) => +v)
	.Encode((v: number) => '' + v)

// "accept a number OR a numeric string" — the common coercion shape
const Numeric = t.Union([t.Number(), StringToNumber])

describe('decode mode', () => {
	it('decode codec leaf inside an object (headline case)', () => {
		const shape = t.Object({ id: Numeric })
		const mirror = createMirror(shape, { decode: true, Compile })

		expect(mirror({ id: '2' })).toEqual({ id: 2 })
	})

	it('leave already-decoded union branch untouched', () => {
		const shape = t.Object({ id: Numeric })
		const mirror = createMirror(shape, { decode: true, Compile })

		expect(mirror({ id: 2 })).toEqual({ id: 2 })
	})

	it('coerce and clean in a single pass', () => {
		const shape = t.Object({ id: Numeric, x: t.String() })
		const mirror = createMirror(shape, { decode: true, Compile })

		// @ts-expect-error junk is stripped
		expect(mirror({ id: '2', x: 'a', junk: 1 })).toEqual({ id: 2, x: 'a' })
	})

	it('decode nested object', () => {
		const shape = t.Object({ a: t.Object({ b: Numeric }) })
		const mirror = createMirror(shape, { decode: true, Compile })

		expect(mirror({ a: { b: '5' } })).toEqual({ a: { b: 5 } })
	})

	it('decode array of codec', () => {
		const shape = t.Object({ ids: t.Array(Numeric) })
		const mirror = createMirror(shape, { decode: true, Compile })

		expect(mirror({ ids: ['1', '2'] })).toEqual({ ids: [1, 2] })
	})

	it('not transform an optional missing value', () => {
		const shape = t.Object({ id: t.Optional(Numeric) })
		const mirror = createMirror(shape, { decode: true, Compile })

		expect(mirror({})).toEqual({})
	})

	it('decode optional present value', () => {
		const shape = t.Object({ id: t.Optional(Numeric) })
		const mirror = createMirror(shape, { decode: true, Compile })

		expect(mirror({ id: '2' })).toEqual({ id: 2 })
	})

	it('decode a non-union codec leaf', () => {
		const shape = t.Object({ id: StringToNumber })
		const mirror = createMirror(shape, { decode: true })

		expect(mirror({ id: '2' })).toEqual({ id: 2 } as any)
	})

	it('decode a root scalar codec leaf', () => {
		const mirror = createMirror(StringToNumber, { decode: true })

		expect(mirror('2')).toBe(2 as any)
	})

	it('decode a root array of codec leaf', () => {
		const mirror = createMirror(t.Array(StringToNumber), { decode: true })

		expect(mirror(['1', '2', '3'])).toEqual([1, 2, 3] as any)
	})

	it('decode a record of codec leaf', () => {
		const shape = t.Record(t.String(), StringToNumber)
		const mirror = createMirror(shape, { decode: true })

		expect(mirror({ a: '1', b: '2' })).toEqual({ a: 1, b: 2 } as any)
	})

	it('decode a tuple of codec leaf', () => {
		const shape = t.Tuple([StringToNumber, t.String()])
		const mirror = createMirror(shape, { decode: true })

		expect(mirror(['1', 'a'])).toEqual([1, 'a'] as any)
	})

	it('match TypeBox Value.Decode', () => {
		const shape = t.Object({ a: t.Object({ b: Numeric }), ids: t.Array(Numeric) })
		const mirror = createMirror(shape, { decode: true, Compile })

		const value = { a: { b: '5' }, ids: ['1', '2'] }

		expect(mirror(structuredClone(value))).toEqual(
			Value.Decode(shape, structuredClone(value)) as any
		)
	})
})

describe('encode mode', () => {
	it('encode a codec leaf inside an object', () => {
		const shape = t.Object({ id: StringToNumber })
		const mirror = createMirror(shape, { encode: true })

		expect(mirror({ id: 2 } as any)).toEqual({ id: '2' })
		// matches TypeBox's own encode for a plain codec leaf
		expect(mirror({ id: 2 } as any)).toEqual(
			Value.Encode(shape, { id: 2 }) as any
		)
	})

	it('encode a root scalar codec leaf', () => {
		const mirror = createMirror(StringToNumber, { encode: true })

		expect(mirror(2 as any)).toBe('2')
	})
})

describe('transform off (default)', () => {
	it('produce byte-identical clean output when off', () => {
		const shape = t.Object({ id: Numeric, name: t.String() })

		const clean = createMirror(shape, { Compile })
		const decode = createMirror(shape, { Compile, decode: false })

		const value = { id: '2', name: 'a' }

		expect(clean(structuredClone(value))).toEqual(
			Value.Clean(shape, structuredClone(value)) as any
		)
		// off === current clean behavior: the union string stays a string
		expect(decode(structuredClone(value))).toEqual({ id: '2', name: 'a' })
	})

	it('not collect codecs when off', () => {
		const shape = t.Object({ id: StringToNumber })

		const { externals } = createMirror(shape, { emit: true })

		// no unions, no sanitize, no codecs collected → no externals
		expect(externals).toBeUndefined()
	})
})

describe('decode mode emit', () => {
	it('lift codec closures into externals and round-trip', () => {
		const shape = t.Object({ id: StringToNumber })

		const { source, externals } = createMirror(shape, {
			emit: true,
			decode: true
		})

		expect(source).toBeString()
		expect(externals.codecs).toBeArrayOfSize(1)
		// source references the codec by index, not an inlined closure
		expect(source).toInclude('d.codecs[0]')

		// reconstruct the runtime fn from the manifest and confirm parity
		const fn = Function('d', source)({ codecs: externals.codecs })
		expect(fn({ id: '2' })).toEqual({ id: 2 })
	})

	it('lift codecs alongside unions', () => {
		const shape = t.Object({ id: Numeric })

		const { source, externals } = createMirror(shape, {
			emit: true,
			decode: true,
			Compile
		})

		expect(externals.unions).toHaveLength(1)
		expect(externals.codecs).toBeArrayOfSize(1)

		const fn = Function('d', source)({
			unions: externals.unions,
			codecs: externals.codecs
		})
		expect(fn({ id: '2' })).toEqual({ id: 2 })
		expect(fn({ id: 2 })).toEqual({ id: 2 })
	})
})
