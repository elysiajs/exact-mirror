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

const Numeric = t.Union([t.Number(), StringToNumber])

const StringToBoolean = t
	.Codec(t.String())
	.Decode((v: string) => v === 'true')
	.Encode((v: boolean) => '' + v)

const BooleanString = t.Union([t.Boolean(), StringToBoolean])

const StringToDate = t
	.Codec(t.String())
	.Decode((v: string) => new Date(v))
	.Encode((v: Date) => v.toISOString())

/**
 * A codec whose decoded side is a different *container* than its encoded side
 * — the shape Elysia's `t.ObjectString` and `t.ArrayString` produce, where a
 * JSON string decodes into an object or an array.
 */
const jsonCodec = (inner: any) =>
	t
		.Codec(t.String())
		// decoding the inner schema too is what Elysia's own ObjectString does,
		// so inner codecs are already applied by the time the mirror sees it
		.Decode((v: string) => Value.Decode(inner, JSON.parse(v)))
		.Encode((v: unknown) => JSON.stringify(v))

const ObjectString = (properties: any) => {
	const inner = t.Object(properties)

	return t.Union([inner, jsonCodec(inner)])
}

const ArrayString = (items: any) => {
	const inner = t.Array(items)

	return t.Union([inner, jsonCodec(inner)])
}

/**
 * The optional-cleanup epilogue deletes keys the input did not carry, which it
 * decides by reading the key's path on the *input*. Behind a codec that swaps
 * the container's type that path does not exist — `v.m?.n` on a JSON string is
 * always undefined — so every decoded key was being deleted right back out of
 * the result. These pin the decoded value through such a codec.
 */
describe('codec that changes the container type', () => {
	it('keeps a union-typed property decoded from a string', () => {
		const shape = t.Object({ m: ObjectString({ n: Numeric, s: t.String() }) })
		const mirror = createMirror(shape, { decode: true, Compile })

		expect(mirror({ m: '{"n":"42","s":"keep"}' } as any)).toEqual({
			m: { n: 42, s: 'keep' }
		})
	})

	it('keeps an optional plain property decoded from a string', () => {
		// no coercion anywhere: being optional is enough to be deleted
		const shape = t.Object({ m: ObjectString({ s: t.Optional(t.String()) }) })
		const mirror = createMirror(shape, { decode: true, Compile })

		expect(mirror({ m: '{"s":"keep"}' } as any)).toEqual({
			m: { s: 'keep' }
		})
	})

	it('keeps a boolean-string property decoded from a string', () => {
		const shape = t.Object({ m: ObjectString({ b: BooleanString }) })
		const mirror = createMirror(shape, { decode: true, Compile })

		expect(mirror({ m: '{"b":"true"}' } as any)).toEqual({ m: { b: true } })
	})

	it('keeps a date property decoded from a string', () => {
		// Elysia's t.Date is this shape: an already-built Date, or a string
		// that decodes into one
		const DateLike = t.Union([
			t.Unsafe<Date>({ type: 'object' } as any),
			StringToDate
		])
		const shape = t.Object({ m: ObjectString({ w: DateLike }) })
		const mirror = createMirror(shape, { decode: true, Compile })

		const out = mirror({ m: '{"w":"2026-01-02T03:04:05.000Z"}' } as any)
		expect((out as any).m.w).toBeInstanceOf(Date)
		expect((out as any).m.w.toISOString()).toBe('2026-01-02T03:04:05.000Z')
	})

	it('keeps a nested object property decoded from a string', () => {
		const shape = t.Object({
			m: ObjectString({ o: t.Object({ n: Numeric }) })
		})
		const mirror = createMirror(shape, { decode: true, Compile })

		expect(mirror({ m: '{"o":{"n":"42"}}' } as any)).toEqual({
			m: { o: { n: 42 } }
		})
	})

	it('still drops a key the decoded value genuinely lacks', () => {
		// the cleanup itself has to survive: an absent optional stays absent
		const shape = t.Object({
			m: ObjectString({ s: t.Optional(t.String()), k: t.String() })
		})
		const mirror = createMirror(shape, { decode: true, Compile })

		const out = mirror({ m: '{"k":"here"}' } as any) as any
		expect(out).toEqual({ m: { k: 'here' } })
		expect('s' in out.m).toBe(false)
	})

	it('leaves an already-decoded container untouched', () => {
		const shape = t.Object({ m: ObjectString({ n: Numeric, s: t.String() }) })
		const mirror = createMirror(shape, { decode: true, Compile })

		expect(mirror({ m: { n: '42', s: 'keep' } } as any)).toEqual({
			m: { n: 42, s: 'keep' }
		})
	})

	it('decodes array elements through the same codec shape', () => {
		// control: array elements are addressed positionally, so they never hit
		// the epilogue and were correct even before the fix
		const shape = t.Object({ a: ArrayString(Numeric) })
		const mirror = createMirror(shape, { decode: true, Compile })

		expect(mirror({ a: '["1","2"]' } as any)).toEqual({ a: [1, 2] })
	})

	it('decodes an object-string nested inside an array-string', () => {
		const shape = t.Object({ a: ArrayString(ObjectString({ n: Numeric })) })
		const mirror = createMirror(shape, { decode: true, Compile })

		expect(mirror({ a: '[{"n":"42"}]' } as any)).toEqual({ a: [{ n: 42 }] })
	})

	it('does not disturb an optional behind a plain union', () => {
		// no codec in this union, so the input path stays authoritative
		const shape = t.Object({
			m: t.Union([t.Object({ s: t.Optional(t.String()) }), t.Number()])
		})
		const mirror = createMirror(shape, { decode: true, Compile })

		const out = mirror({ m: {} } as any) as any
		expect('s' in out.m).toBe(false)
		expect(mirror({ m: { s: 'x' } } as any)).toEqual({ m: { s: 'x' } })
	})
})
