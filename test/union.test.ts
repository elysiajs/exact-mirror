import { t } from 'elysia'

import { describe, it } from 'bun:test'

import { isEqual, notEqual, isUndefined } from './utils'

describe('Union', () => {
	it('handle union at root', () => {
		const shape = t.Union([t.String(), t.Number()])

		isEqual(shape, 'saltyaom')
		isEqual(shape, 1)
		// @ts-expect-error
		isUndefined(shape, true)
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
		isUndefined(shape, 'a')
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
		isUndefined(shape, 'a')
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
		isUndefined(shape, 'a')
	})
})
