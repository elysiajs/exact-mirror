import { t } from 'elysia'

import { describe, it } from 'bun:test'

import { isEqual, notEqual } from './utils'

describe('Union', () => {
	it('handle union at root', () => {
		const shape = t.Union([t.String(), t.Number()])

		isEqual(shape, 'saltyaom')
		isEqual(shape, 1)
		// @ts-expect-error
		isEqual(shape, true)
	})

	it('handle union object', () => {
		const shape = t.Union([
			t.Object({
				a: t.String()
			}),
			t.Object(
				{
					b: t.String()
				},
				{
					additionalProperties: true
				}
			),
			t.Number()
		])

		isEqual(shape, {
			a: 'a'
		})
		notEqual(shape, {
			a: 'a',
			b: 'b'
		})

		isEqual(shape, {
			b: 'a',
			// @ts-expect-error
			c: 'c'
		})
		notEqual(
			shape,
			{
				b: 'a',
				// @ts-expect-error
				c: 'c'
			},
			{
				b: 'a'
			}
		)

		isEqual(shape, 1)

		// @ts-expect-error
		isEqual(shape, 'a')
	})

	it('handle union object with optional', () => {
		const shape = t.Union([
			t.Object({
				a: t.String(),
				d: t.Optional(t.String())
			}),
			t.Object(
				{
					b: t.String()
				},
				{
					additionalProperties: true
				}
			),
			t.Number()
		])

		isEqual(shape, {
			a: 'a'
		})
		notEqual(shape, {
			a: 'a',
			b: 'b'
		})

		isEqual(shape, {
			a: 'a',
			d: 'd'
		})
		notEqual(shape, {
			a: 'a',
			b: 'b',
			d: 'd'
		})

		isEqual(shape, {
			b: 'a',
			// @ts-expect-error
			c: 'c'
		})
		notEqual(
			shape,
			{
				b: 'a',
				// @ts-expect-error
				c: 'c'
			},
			{
				b: 'a'
			}
		)

		isEqual(shape, 1)

		// @ts-expect-error
		isEqual(shape, 'a')
	})

	it('handle nested union', () => {
		const shape = t.Union([
			t.Object({
				a: t.String()
			}),
			t.Object(
				{
					b: t.String()
				},
				{
					additionalProperties: true
				}
			),
			t.Number()
		])

		isEqual(shape, {
			a: 'a'
		})
		notEqual(shape, {
			a: 'a',
			b: 'b'
		})

		isEqual(shape, {
			b: 'a',
			// @ts-expect-error
			c: 'c'
		})
		notEqual(
			shape,
			{
				b: 'a',
				// @ts-expect-error
				c: 'c'
			},
			{
				b: 'a'
			}
		)

		isEqual(shape, 1)

		// @ts-expect-error
		isEqual(shape, 'a')
	})

	it('handle undefined union', () => {
		const shape = t.Union([
			t.Undefined(),
			t.Object({
				name: t.String(),
				job: t.String(),
				trait: t.Optional(t.String())
			})
		])

		isEqual(shape, undefined)

		isEqual(shape, {
			name: 'a',
			job: 'b',
			trait: 'c'
		})

		isEqual(shape, {
			name: 'a',
			job: 'b'
		})
	})

	it('return shape regardless of correctness', () => {
		const shape = t.Object({
			foo: t.Optional(
				t.Nullable(
					t.Object({
						a: t.Number({
							error: 'Must be a number'
						})
					})
				)
			)
		})

		const value = {
			// @ts-expect-error
			foo: 123
		} satisfies typeof shape.static

		isEqual(
			shape,
			// @ts-expect-error
			value
		)
	})

	it('handle clean then check', () => {
		const SchemaA = t.Object(
			{ foo: t.Number() },
			{
				additionalProperties: false
			}
		)
		const SchemaB = t.Object(
			{ foo: t.Number(), baz: t.Boolean() },
			{
				additionalProperties: false
			}
		)
		const UnionSchema = t.Union([SchemaA, SchemaB])
		const OmittedUnionSchema = t.Omit(UnionSchema, ['baz'])

		const shape = OmittedUnionSchema

		const value = { foo: 1 } satisfies typeof shape.static

		isEqual(
			shape,
			{
				// @ts-ignore
				baz: true,
				foo: 1
			},
			value
		)
	})
})
