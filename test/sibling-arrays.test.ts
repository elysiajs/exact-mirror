import { t } from 'elysia'

import { describe, it } from 'bun:test'
import { isEqual } from './utils'

describe('Sibling Arrays', () => {
	/**
	 * Regression test for sibling array index collision bug.
	 * Previously, sibling arrays would share the same optionalsInArray index,
	 * causing cleanup code for one array to reference properties from another.
	 */
	it('handle sibling arrays with optionals in different objects', () => {
		const shape = t.Object({
			a: t.Array(
				t.Object({
					obj: t.Object({
						n: t.Nullable(t.Object({ v: t.String() }))
					})
				})
			),
			b: t.Object({
				arr: t.Array(t.Object({ x: t.Integer() }))
			})
		})

		const value = {
			a: [{ obj: { n: null } }],
			b: { arr: [{ x: 1 }] }
		}

		// Should not throw "Cannot read properties of undefined (reading 'n')"
		isEqual(shape, value)
	})

	it('handle sibling arrays at same depth with optionals', () => {
		const shape = t.Object({
			first: t.Array(
				t.Object({
					name: t.String(),
					optional: t.Optional(t.String())
				})
			),
			second: t.Array(
				t.Object({
					id: t.Number(),
					optional: t.Optional(t.Number())
				})
			)
		})

		const value = {
			first: [
				{ name: 'a', optional: 'x' },
				{ name: 'b' } // no optional
			],
			second: [
				{ id: 1 },
				{ id: 2, optional: 42 }
			]
		}

		const expected = {
			first: [
				{ name: 'a', optional: 'x' },
				{ name: 'b' }
			],
			second: [
				{ id: 1 },
				{ id: 2, optional: 42 }
			]
		}

		isEqual(shape, value, expected)
	})

	it('handle nested arrays with optionals at multiple levels', () => {
		const shape = t.Array(
			t.Object({
				name: t.String(),
				games: t.Array(
					t.Object({
						id: t.Number(),
						hoursPlay: t.Optional(t.Number())
					})
				),
				// This optional should not be affected by games array processing
				social: t.Optional(
					t.Object({
						twitter: t.Optional(t.String())
					})
				)
			})
		)

		const value = [
			{
				name: 'user1',
				games: [
					{ id: 1, hoursPlay: 10 },
					{ id: 2 }
				],
				social: { twitter: 'user1' }
			},
			{
				name: 'user2',
				games: [{ id: 3 }]
				// no social
			}
		]

		const expected = [
			{
				name: 'user1',
				games: [
					{ id: 1, hoursPlay: 10 },
					{ id: 2 }
				],
				social: { twitter: 'user1' }
			},
			{
				name: 'user2',
				games: [{ id: 3 }]
			}
		]

		isEqual(shape, value, expected)
	})
})
