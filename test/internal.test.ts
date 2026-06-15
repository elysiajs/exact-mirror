import { Type as t } from 'typebox'

import { describe, it, expect } from 'bun:test'

import { copySchema, createMirror, deepClone } from '../src'

// string <-> number codec; `~kind` / `~codec` are non-enumerable
const StringToNumber = t
	.Codec(t.String())
	.Decode((v: string) => +v)
	.Encode((v: number) => '' + v)

// every own key, including the non-enumerable ones a spread would drop
const ownKeys = (o: object) => Reflect.ownKeys(o).map(String).sort()

describe('deepClone', () => {
	it('return primitives, null and functions as-is', () => {
		const fn = () => 1

		expect(deepClone(5)).toBe(5)
		expect(deepClone('a')).toBe('a')
		expect(deepClone(true)).toBe(true)
		expect(deepClone(null)).toBe(null)
		expect(deepClone(undefined)).toBe(undefined)
		expect(deepClone(fn)).toBe(fn)
	})

	it('deep clone nested objects and arrays', () => {
		const src = { a: 1, nested: { b: 2 }, arr: [1, { c: 3 }] }
		const cloned = deepClone(src)

		expect(cloned).toEqual(src)
		expect(cloned).not.toBe(src)
		expect(cloned.nested).not.toBe(src.nested)
		expect(cloned.arr).not.toBe(src.arr)
		expect(cloned.arr[1]).not.toBe(src.arr[1])
	})

	it('copy symbol keys and functions by reference', () => {
		const sym = Symbol('s')
		const fn = () => 1
		const src: any = { fn, [sym]: 'x' }
		const cloned = deepClone(src)

		expect(cloned[sym]).toBe('x')
		expect(cloned.fn).toBe(fn)
	})

	it('preserve circular references through objects', () => {
		const src: any = { name: 'root' }
		src.self = src

		const cloned = deepClone(src)

		expect(cloned).not.toBe(src)
		expect(cloned.self).toBe(cloned)
		expect(cloned.name).toBe('root')
	})

	it('preserve circular references through arrays', () => {
		const src: any[] = [1]
		src.push(src)

		const cloned = deepClone(src)

		expect(cloned).not.toBe(src)
		expect(cloned[0]).toBe(1)
		expect(cloned[1]).toBe(cloned)
	})
})

// `t.Optional` adds a non-enumerable `~optional`, `t.Codec` adds non-enumerable
// `~kind` / `~codec`, `t.Union` carries non-enumerable `~kind` + `anyOf` — all
// of which a spread / `Object.assign` would silently drop. Both copy helpers
// must preserve them.
describe('copySchema (shallow, descriptor-preserving)', () => {
	it('copy t.Optional(t.Codec(...)) keeping ~kind / ~codec / ~optional', () => {
		const source = t.Optional(StringToNumber) as any
		const copy = copySchema(source) as any

		expect(copy).not.toBe(source)
		expect(ownKeys(copy)).toEqual(ownKeys(source))
		expect(ownKeys(copy)).toContain('~kind')
		expect(ownKeys(copy)).toContain('~codec')
		expect(ownKeys(copy)).toContain('~optional')
		expect(copy['~optional']).toBe(true)
		// the codec transform still works on the copy
		expect(copy['~codec'].decode('5')).toBe(5)
		expect(copy['~codec'].encode(5)).toBe('5')
	})

	it('copy t.Union([..., t.Codec(...)]) keeping ~kind and codec members', () => {
		const source = t.Union([t.Number(), StringToNumber]) as any
		const copy = copySchema(source) as any

		expect(copy).not.toBe(source)
		expect(copy['~kind']).toBe('Union')
		expect(ownKeys(copy)).toContain('~kind')
		// shallow copy shares the member array, so the codec member is intact
		expect('~codec' in copy.anyOf[1]).toBe(true)
		expect(copy.anyOf[1]['~codec'].decode('7')).toBe(7)
	})

	it('copy t.Optional(t.Union([..., t.Codec(...)])) keeping every modifier', () => {
		const source = t.Optional(t.Union([t.Number(), StringToNumber])) as any
		const copy = copySchema(source) as any

		expect(copy['~kind']).toBe('Union')
		expect(copy['~optional']).toBe(true)
		expect(ownKeys(copy)).toContain('~optional')
		expect('~codec' in copy.anyOf[1]).toBe(true)
		expect(copy.anyOf[1]['~codec'].decode('9')).toBe(9)
	})
})

describe('deepClone (deep, descriptor-preserving)', () => {
	it('clone t.Optional(t.Codec(...)) keeping ~kind / ~codec / ~optional', () => {
		const source = t.Optional(StringToNumber) as any
		const clone = deepClone(source) as any

		expect(clone).not.toBe(source)
		expect(ownKeys(clone)).toEqual(ownKeys(source))
		expect(clone['~optional']).toBe(true)
		expect(clone['~codec'].decode('5')).toBe(5)
		expect(clone['~codec'].encode(5)).toBe('5')
	})

	it('deep clone t.Optional(t.Union([..., t.Codec(...)])) — fresh members, metadata intact', () => {
		const source = t.Optional(t.Union([t.Number(), StringToNumber])) as any
		const clone = deepClone(source) as any

		expect(clone['~kind']).toBe('Union')
		expect(clone['~optional']).toBe(true)

		// deep clone allocates fresh nested objects/arrays...
		expect(clone.anyOf).not.toBe(source.anyOf)
		expect(clone.anyOf[1]).not.toBe(source.anyOf[1])

		// ...yet the codec member still carries a working transform
		expect('~codec' in clone.anyOf[1]).toBe(true)
		expect(clone.anyOf[1]['~codec'].decode('11')).toBe(11)
	})
})

describe('Union without Compile', () => {
	it('warn once and pass the value through as-is', () => {
		const original = console.warn
		let warned = 0
		console.warn = () => {
			warned++
		}

		try {
			const mirror = createMirror(t.Union([t.String(), t.Number()]))

			// no TypeCompiler -> union cannot be resolved, value returned as-is
			expect(mirror('hello' as any)).toBe('hello')
			expect(warned).toBeGreaterThan(0)
		} finally {
			console.warn = original
		}
	})

	it('pass a nested union property through as-is without Compile', () => {
		const original = console.warn
		console.warn = () => {}

		try {
			const mirror = createMirror(
				t.Object({ id: t.Union([t.String(), t.Number()]) })
			)

			// union member is not resolved, but surrounding object is still cleaned
			expect(
				mirror({ id: 'hello', extra: 'strip' } as any)
			).toStrictEqual({ id: 'hello' } as any)
		} finally {
			console.warn = original
		}
	})
})
