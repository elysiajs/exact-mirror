import { t } from 'elysia'

import { describe, it } from 'bun:test'

import { isEqual, isEqualToTypeBox } from './utils'

// An array inside a union branch is mirrored against the raw value by the
// `cleanThenCheck` pass, which runs EVERY branch's mirror expression - so the
// array wrapper receives values that belong to another branch, or no branch.
describe('Union with an array branch', () => {
	const strictNode = t.Union([
		t.Object(
			{
				type: t.Literal('AND'),
				children: t.Array(t.Object({ type: t.String() }))
			},
			{ additionalProperties: false }
		),
		t.Object(
			{
				type: t.Literal('leaf'),
				param: t.String()
			},
			{ additionalProperties: false }
		)
	])

	it('clean then check a branch without the array property', () => {
		const shape = t.Object({ tree: strictNode })

		isEqual(
			shape,
			{
				tree: {
					type: 'leaf',
					param: 'p',
					// @ts-ignore
					junk: 1
				}
			},
			{
				tree: {
					type: 'leaf',
					param: 'p'
				}
			}
		)
	})

	it('return a value matching no branch as-is', () => {
		const shape = t.Object({ tree: strictNode })

		isEqual(
			shape,
			// @ts-ignore
			{ tree: { type: 'AND' } }
		)
	})

	it('return null in an array-bearing union as-is', () => {
		const shape = t.Object({ tree: strictNode })

		isEqual(
			shape,
			// @ts-ignore
			{ tree: null }
		)
	})

	it('handle null on a root union with an array branch', () => {
		const shape = t.Union([
			t.Array(t.Object({ a: t.String() })),
			t.Object({ b: t.String() })
		])

		isEqual(
			shape,
			// @ts-ignore
			null
		)
	})

	it('handle a non-array on an array root', () => {
		const shape = t.Array(t.Object({ a: t.String() }))

		isEqualToTypeBox(
			shape,
			// @ts-ignore
			null
		)
	})

	it('return a non-array at an optional array property as-is, no union', () => {
		const shape = t.Object({
			x: t.Optional(t.Array(t.Object({ a: t.String() })))
		})

		isEqual(
			shape,
			// @ts-ignore
			{ x: null }
		)
	})
})
