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

	it('handle reference in array', () => {
		const shape = t.Recursive((This) =>
			t.Object({
				type: t.String(),
				data: t.Array(This)
			})
		)

		const value = {
			type: 'yea',
			data: [
				{
					type: 'ok',
					data: [
						{
							type: 'cool',
							data: []
						}
					]
				}
			]
		} satisfies typeof shape.static

		isEqual(shape, value)
	})

	it('handle reference of an union in an array', () => {
		const shape = t.Recursive((This) =>
			t.Object({
				type: t.String(),
				data: t.Union([t.Nullable(This), t.Array(This)])
			})
		)

		const value = {
			type: 'yea',
			data: {
				type: 'ok',
				data: [
					{
						type: 'cool',
						data: null
					}
				]
			}
		} satisfies typeof shape.static

		isEqual(shape, value)
	})
})
