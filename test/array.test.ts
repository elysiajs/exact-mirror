import { t } from 'elysia'

import { describe, it, expect } from 'bun:test'
import { Compile } from 'typebox/compile'
import { isEqual } from './utils'
import { createMirror } from '../src'

describe('Array', () => {
	it('handle array at root', () => {
		const shape = t.Array(t.String())

		isEqual(shape, ['a', 'b'])
	})

	it('handle array union at root', () => {
		const shape = t.Array(t.Union([t.String(), t.Number()]))

		isEqual(shape, ['a', 'b', 1, 2, 'c'])
	})

	it('handle array object', () => {
		const shape = t.Array(
			t.Object({
				a: t.String(),
				b: t.String()
			})
		)

		isEqual(
			shape,
			[
				{
					a: 'a',
					b: 'b'
				},
				{
					a: 'a',
					b: 'b',
					// @ts-expect-error
					c: 'c'
				}
			],
			[
				{
					a: 'a',
					b: 'b'
				},
				{
					a: 'a',
					b: 'b'
				}
			]
		)
	})

	it('handle array object with optional', () => {
		const shape = t.Array(
			t.Object({
				a: t.String(),
				b: t.Optional(t.String())
			})
		)

		isEqual(
			shape,
			[
				{
					a: 'a'
				},
				{
					a: 'a',
					b: 'b'
				},
				{
					a: 'a',
					b: 'b',
					// @ts-expect-error
					c: 'c'
				}
			],
			[
				{ a: 'a' },
				{
					a: 'a',
					b: 'b'
				},
				{
					a: 'a',
					b: 'b'
				}
			]
		)
	})
})

describe('Array on a value nothing checked', () => {
	const mirror = (shape: any) => createMirror(shape, { Compile })
	const item = t.Object({ x: t.Optional(t.Number()) })

	// `length` sizes the copy: an object that only claims one would allocate
	// whatever number the caller typed
	it('does not allocate from the length of a non-array', () => {
		const forged = { length: 100_000_000 }

		expect(mirror(t.Array(item))(forged)).toEqual([])
		expect(
			mirror(t.Object({ arr: t.Array(item) }))({ arr: forged })
		).toEqual({ arr: [] })
		expect(mirror(t.Array(t.Array(item)))([forged])).toEqual([[]])
	})

	it('does not spread a string into items', () => {
		expect(mirror(t.Array(item))('abc')).toEqual([])
		expect(
			mirror(t.Object({ arr: t.Array(item) }))({ arr: 'abc' })
		).toEqual({ arr: [] })
	})

	// a caller that cleans without checking must not get the value back whole
	it('keeps no field of an object where an array is expected', () => {
		expect(mirror(t.Array(item))({ secret: 'x' })).toEqual([])
	})

	it('still strips items of a real array', () => {
		expect(mirror(t.Array(item))([{ x: 1, y: 2 }])).toEqual([{ x: 1 }])
	})
})
