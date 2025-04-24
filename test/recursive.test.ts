import { t } from 'elysia'

import { describe, it, expect } from 'bun:test'
import { isEqual } from './utils'

describe('Recursive', () => {
	it('exit from union', () => {
		const shape = t.Recursive(
			(This) =>
				t.Object({
					type: t.String(),
					a: t.Optional(This)
				}),
			{ $id: 'Node' }
		)

		const value = {
			type: 'a',
			a: {
				type: 'b',
				a: {
					type: 'c'
				}
			}
		} satisfies typeof shape.static
	})

	it('exit from array', () => {
		const shape = t.Recursive(
			(This) =>
				t.Object({
					type: t.String(),
					a: t.Array(This)
				}),
			{ $id: 'Node' }
		)

		const value = {
			type: 'a',
			a: [
				{
					type: 'a',
					a: []
				}
			]
		}

		isEqual(shape, value)
	})
})
