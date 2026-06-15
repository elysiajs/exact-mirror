import { Type as t } from 'typebox'

import { describe, it, expect } from 'bun:test'

import { createMirror, deepClone } from '../src'

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
