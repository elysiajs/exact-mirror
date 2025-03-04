import { t } from 'elysia'

import { describe, it } from 'bun:test'
import { isEqual } from './utils'

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
