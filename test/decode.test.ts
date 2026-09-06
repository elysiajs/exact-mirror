import { Type as t } from 'typebox'
import { Compile } from 'typebox/compile'
import { Value } from 'typebox/value'

import { describe, expect, it } from 'bun:test'

import { createMirror, deepClone } from '../src'

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

describe('deepClone preserves TypeBox metadata (non-enumerable)', () => {
	it('keep ~codec / ~kind and a working transform', () => {
		const clone = deepClone(StringToNumber) as any

		expect('~codec' in clone).toBe(true)
		expect('~kind' in clone).toBe(true)
		// the cloned codec still decodes/encodes
		expect(clone['~codec'].decode('5')).toBe(5)
		expect(clone['~codec'].encode(5)).toBe('5')
	})

	it('keep ~refine', () => {
		const refined = (t as any).Refine(
			t.String(),
			(s: string) => s.length > 2,
			'too short'
		)
		const clone = deepClone(refined) as any

		expect('~refine' in clone).toBe(true)
		expect('~kind' in clone).toBe(true)
	})
})

describe('codec inside Intersect (decode)', () => {
	// Bug 1: TypeBox `Type.Intersect` is `{ '~kind': 'Intersect', allOf }` with
	// no `type`, so codec leaves inside it were never threaded into the walk.
	const schema = t.Intersect([
		t.Object({ foo: t.String() }),
		t.Object({
			field: t
				.Codec(t.String())
				.Decode((d: string) => ({ decoded: d }))
				.Encode((v: { decoded: string }) => v.decoded)
		})
	])

	it('decode codec leaves inside an intersect, matching Value.Decode', () => {
		const mirror = createMirror(schema, { Compile, decode: true })
		const input = { field: 'bar', foo: 'test' }

		expect(mirror(input as any)).toEqual(Value.Decode(schema, input) as any)
	})

	it('still strips excess keys (clean output matches Value.Clean)', () => {
		const mirror = createMirror(schema, { Compile })
		const input = { field: 'bar', foo: 'test', junk: 1 }

		expect(mirror(input as any)).toEqual(
			Value.Clean(schema, structuredClone(input)) as any
		)
	})
})

describe('decode build does not mutate the input union schema (Bug 2)', () => {
	const StringToBool = t
		.Codec(t.String())
		.Decode((s: string) => s === 'true')
		.Encode((b: boolean) => '' + b)

	const u = t.Union([t.Boolean(), StringToBool])
	const shape = t.Object({
		flag: u,
		list: t.Array(u),
		nested: t.Object({ f: u })
	})

	it('keeps member identity, ~codec, and downstream Value.* across builds', () => {
		const memberBefore = (u as any).anyOf[1]

		const encoded = {
			flag: 'true',
			list: ['true', 'false'],
			nested: { f: 'true' }
		}
		const decoded = { flag: true, list: [true, false], nested: { f: true } }

		// baseline on the SAME schema instance, before any mirror is built
		const decodeBefore = Value.Decode(shape, structuredClone(encoded))
		const createBefore = Value.Create(shape)

		// building decode mirrors must not corrupt the shared schema — run twice
		createMirror(shape, { Compile, decode: true })
		createMirror(shape, { Compile, decode: true })

		// the caller's union node is byte-identical: same member object, codec intact
		expect((u as any).anyOf[1]).toBe(memberBefore)
		expect('~codec' in (u as any).anyOf[1]).toBe(true)

		// Value.Decode / Value.Create on the same instance are unchanged
		expect(decodeBefore).toEqual(decoded as any)
		expect(Value.Decode(shape, structuredClone(encoded))).toEqual(
			decoded as any
		)
		expect(Value.Create(shape)).toEqual(createBefore as any)
	})
})

describe('Optional + Union + Codec combination (decode)', () => {
	// exercises copySchema in the real handleUnion path: the optional union
	// member must be copied without dropping `~codec` / `~optional`
	const shape = t.Object({
		id: t.Optional(t.Union([t.Number(), StringToNumber]))
	})

	it('decode a present numeric-string through an optional union codec', () => {
		const mirror = createMirror(shape, { Compile, decode: true })

		expect(mirror({ id: '2' })).toEqual({ id: 2 })
	})

	it('leave a present number untouched', () => {
		const mirror = createMirror(shape, { Compile, decode: true })

		expect(mirror({ id: 2 })).toEqual({ id: 2 })
	})

	it('omit a missing optional', () => {
		const mirror = createMirror(shape, { Compile, decode: true })

		expect(mirror({})).toEqual({})
	})

	it('match Value.Decode across present / absent', () => {
		const mirror = createMirror(shape, { Compile, decode: true })

		expect(mirror({ id: '2' })).toEqual(Value.Decode(shape, { id: '2' }) as any)
		expect(mirror({})).toEqual(Value.Decode(shape, {}) as any)
	})

	it('does not mutate the shared union node (Bug 2) — modifiers survive', () => {
		const union = (shape.properties.id as any)
		const memberBefore = union.anyOf[1]

		createMirror(shape, { Compile, decode: true })
		createMirror(shape, { Compile, decode: true })

		expect(union.anyOf[1]).toBe(memberBefore)
		expect('~codec' in union.anyOf[1]).toBe(true)
		// `~optional` lives on the union node itself; it must be intact too
		expect(union['~optional']).toBe(true)
		expect(Value.Decode(shape, { id: '2' })).toEqual({ id: 2 } as any)
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

describe('decode mode — frozen union members & union refs (regression)', () => {
	// Elysia's coercion types are Object.freeze'd singletons reused as union
	// members. A frozen node's `anyOf`/`items` descriptor is non-writable, so
	// the old `copySchema(node); node.anyOf = …` threw and the whole subtree
	// silently degraded to identity (the value passed through undecoded).
	const FrozenNumeric = Object.freeze(t.Union([t.Number(), StringToNumber]))

	it('decode a frozen union node used as a union member', () => {
		const shape = t.Object({
			a: t.Union([t.Array(FrozenNumeric), FrozenNumeric])
		})
		const mirror = createMirror(shape, { decode: true, Compile })

		expect(mirror({ a: ['7', '8'] })).toEqual({ a: [7, 8] })
		expect(mirror({ a: '9' })).toEqual({ a: 9 })
	})

	it('decode a complex/nested union (array-of-union | scalar)', () => {
		const inner = t.Union([t.Object({ x: Numeric }), Numeric])
		const shape = t.Union([t.Array(inner), Numeric])
		const mirror = createMirror(shape, { decode: true, Compile })

		expect(mirror(['1', { x: '2' }] as any)).toEqual([1, { x: 2 }])
		expect(mirror('5' as any)).toEqual(5)
	})

	it('decode a $ref branch inside a union', () => {
		const shape = t.Object({ a: t.Union([t.Ref('Item'), t.Null()]) })
		const mirror = createMirror(shape as any, {
			decode: true,
			Compile,
			definitions: { Item: t.Object({ n: Numeric }) } as any
		})

		expect(mirror({ a: { n: '9' } } as any)).toEqual({ a: { n: 9 } })
		expect(mirror({ a: null } as any)).toEqual({ a: null })
	})

	it('building a decode mirror does not mutate a frozen union member', () => {
		const before = JSON.stringify(Value.Create(FrozenNumeric))
		createMirror(t.Object({ a: FrozenNumeric }), { decode: true, Compile })

		expect(JSON.stringify(Value.Create(FrozenNumeric))).toBe(before)
		expect(Object.isFrozen(FrozenNumeric)).toBe(true)
	})
})

describe('codec union member replaces its container (decode)', () => {
	const Container = t.Union([
		t.Object({ s: t.Optional(t.String()) }),
		t.Decode(t.String(), (v: string) => JSON.parse(v))
	])

	it('keep optional fields of a decoded container', () => {
		const shape = t.Object({ m: Container })
		const mirror = createMirror(shape, { decode: true, Compile })

		expect(mirror({ m: '{"s":"keep"}' } as any)).toEqual({
			m: { s: 'keep' }
		})
		expect(mirror({ m: '{}' } as any)).toEqual({ m: {} })
		expect(mirror({ m: { s: 'plain' } })).toEqual({ m: { s: 'plain' } })
		expect(mirror({ m: {} })).toEqual({ m: {} })
	})

	it('clean below a union key against the output, never the encoded input', () => {
		const shape = t.Object({ m: Container })
		const source = createMirror(shape, { decode: true, Compile }).toString()

		expect(source).not.toContain('if(v.m?.s===undefined)delete')
	})

	it('keep optional fields of a decoded root container', () => {
		const mirror = createMirror(Container, { decode: true, Compile })

		expect(mirror('{"s":"keep"}' as any)).toEqual({ s: 'keep' })
		expect(mirror({} as any)).toEqual({})
	})

	it('clean and sanitize a decoded container through its sibling member', () => {
		const shape = t.Object({
			m: t.Union([
				t.Object({ n: Numeric, s: t.Optional(t.String()) }),
				t.Decode(t.String(), (v: string) => JSON.parse(v))
			])
		})
		const mirror = createMirror(shape, {
			decode: true,
			Compile,
			sanitize: (v) => v.trim()
		})

		expect(
			mirror({ m: '{"n":"42","s":" keep ","extra":"drop"}' } as any)
		).toEqual({ m: { n: 42, s: 'keep' } })
		expect(mirror({ m: '{"n":"42"}' } as any)).toEqual({ m: { n: 42 } })
		expect(
			mirror({ m: { n: '42', s: ' keep ', extra: 'drop' } } as any)
		).toEqual({ m: { n: 42, s: 'keep' } })
	})

	it('not sanitize a decoded non-string codec value', () => {
		const shape = t.Object({ id: Numeric })
		const mirror = createMirror(shape, {
			decode: true,
			Compile,
			sanitize: (v) => v.trim()
		})

		expect(mirror({ id: '2' })).toEqual({ id: 2 })
	})

	it('keep nested optional fields of a decoded container', () => {
		const shape = t.Object({
			m: t.Union([
				t.Object({ inner: t.Object({ s: t.Optional(t.String()) }) }),
				t.Decode(t.String(), (v: string) => JSON.parse(v))
			])
		})
		const mirror = createMirror(shape, { decode: true, Compile })

		expect(mirror({ m: '{"inner":{"s":"keep"}}' } as any)).toEqual({
			m: { inner: { s: 'keep' } }
		})
		expect(mirror({ m: '{"inner":{}}' } as any)).toEqual({
			m: { inner: {} }
		})
	})
})
