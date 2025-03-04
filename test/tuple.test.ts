import { t } from 'elysia'

import { describe, it } from 'bun:test'
import { isEqual } from './utils'

describe('Tuple', () => {
	it('handle tuple', () => {
		const shape = t.Tuple([t.Literal('a'), t.Literal('b')])

		isEqual(shape, ['a', 'b'])
		// @ts-expect-error
		isEqual(shape, ['a', 'b', 'c'], ['a', 'b'])
	})

	it('handle tuple object', () => {
		const shape = t.Tuple([
			t.Literal('a'),
			t.Object({
				a: t.String(),
				b: t.Optional(t.String())
			})
		])

		isEqual(shape, [
			'a',
			{
				a: 'a'
			}
		])
		isEqual(shape, [
			'a',
			{
				a: 'a',
				b: 'b'
			}
		])

		isEqual(
			shape,
			[
				'a',
				{
					a: 'a',
					b: 'b',
					// @ts-expect-error
					c: 'c'
				}
			],
			[
				'a',
				{
					a: 'a',
					b: 'b'
				}
			]
		)
	})

	it('handle tuple array', () => {
		const shape = t.Tuple([t.Literal('a'), t.Array(t.String())])

		isEqual(shape, ['a', ['a', 'b']])
		// @ts-expect-error
		isEqual(shape, ['a'])
	})

	it('handle nested tuple', () => {
		const shape = t.Tuple([
			t.Literal('a'),
			t.Tuple([t.Literal('b'), t.Literal('c')])
		])

		isEqual(shape, ['a', ['b', 'c']])
	})
})
