import { t } from 'elysia'

import { describe, it } from 'bun:test'
import { isEqual } from './utils'

describe('Record', () => {
	it('handle record', () => {
		const shape = t.Record(t.String(), t.String())

		isEqual(shape, {
			a: 'a',
			b: 'b'
		})
		isEqual(shape, { a: 'a', b: 'b' })
	})

	it('handle record object', () => {
		const shape = t.Record(
			t.String(),
			t.Object({
				a: t.String(),
				b: t.Optional(t.String())
			})
		)

		isEqual(
			shape,
			{
				a: { a: 'a' },
				b: { a: 'a', b: 'b' },
				// @ts-expect-error
				c: { a: 'a', b: 'b', c: 'c' }
			},
			{
				a: { a: 'a' },
				b: { a: 'a', b: 'b' },
				c: { a: 'a', b: 'b' }
			}
		)
	})

	it('handle record array', () => {
		const shape = t.Record(t.String(), t.Array(t.String()))

		isEqual(shape, {
			a: ['a'],
			b: ['a', 'b']
		})
		isEqual(shape, { a: ['a'], b: ['a', 'b'] })
	})

	it('handle nested record', () => {
		const shape = t.Record(t.String(), t.Record(t.String(), t.String()))

		isEqual(shape, {
			a: { a: 'a' },
			b: { a: 'a', b: 'b' }
		})
		isEqual(shape, { a: { a: 'a' }, b: { a: 'a', b: 'b' } })
	})
})
