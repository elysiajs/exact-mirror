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

	it('handle reference nested in an object of an union branch', () => {
		const shape = t.Recursive((This) =>
			t.Object({
				a: t.Union([t.Object({ another_a: This }), t.Literal('x')])
			})
		)

		const value = {
			a: {
				another_a: {
					a: {
						another_a: {
							a: 'x'
						}
					}
				}
			}
		} satisfies typeof shape.static

		isEqual(shape, value)

		isEqual(
			shape,
			{
				a: {
					another_a: {
						a: 'x',
						unknown: 'b'
					},
					unknown: 'c'
				},
				unknown: 'd'
			} as typeof shape.static,
			{
				a: {
					another_a: {
						a: 'x'
					}
				}
			}
		)
	})

	it('handle optional reference nested in an object of an union branch', () => {
		const shape = t.Recursive((This) =>
			t.Object({
				a: t.Optional(
					t.Union([t.Object({ another_a: This }), t.Literal('x')])
				)
			})
		)

		const value = {
			a: {
				another_a: {
					a: {
						another_a: {}
					}
				}
			}
		} satisfies typeof shape.static

		isEqual(shape, value)
		isEqual(shape, {})
	})

	it('handle reference in an array of an union branch', () => {
		const shape = t.Recursive((This) =>
			t.Object({
				a: t.Union([
					t.Array(t.Object({ another_a: This })),
					t.Literal('x')
				])
			})
		)

		const value = {
			a: [
				{
					another_a: {
						a: [
							{
								another_a: {
									a: 'x'
								}
							}
						]
					}
				}
			]
		} satisfies typeof shape.static

		isEqual(shape, value)
	})
})
