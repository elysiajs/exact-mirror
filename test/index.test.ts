import { t } from 'elysia'

import { describe, it, mock } from 'bun:test'
import { isEqual } from './utils'

describe('Core', () => {
	it('handle string', () => {
		const shape = t.String()

		const value = 'saltyaom' satisfies typeof shape.static

		isEqual(shape, value)
	})

	it('handle number', () => {
		const shape = t.Number()

		const value = 0 satisfies typeof shape.static

		isEqual(shape, value)
	})

	it('handle boolean', () => {
		const shape = t.Boolean()

		const value = true satisfies typeof shape.static

		isEqual(shape, value)
	})

	it('handle literal', () => {
		const shape = t.Literal('saltyaom')

		const value = 'saltyaom' satisfies typeof shape.static

		isEqual(shape, value)
	})

	it('handle null', () => {
		const shape = t.Null()

		const value = null satisfies typeof shape.static

		isEqual(shape, value)
	})

	it('handle object', () => {
		const shape = t.Object({
			name: t.String()
		})

		const value = {
			name: 'salt',
			// @ts-expect-error
			additional: 'b'
		} satisfies typeof shape.static

		const expected = {
			name: 'salt'
		} satisfies typeof shape.static

		isEqual(shape, value, expected)
	})

	it('handle nested object', () => {
		const shape = t.Object({
			name: t.String(),
			info: t.Object({
				alias: t.String()
			})
		})

		const value = {
			name: 'salt',
			additional: 'b',
			info: {
				alias: 'salty',
				// @ts-expect-error
				additional: 'b'
			}
		} satisfies typeof shape.static

		const expected = {
			name: 'salt',
			info: {
				alias: 'salty'
			}
		} satisfies typeof shape.static

		isEqual(shape, value, expected)
	})

	it('handle object with optional', () => {
		const shape = t.Object({
			name: t.String(),
			optional1: t.Optional(t.String()),
			optional2: t.Optional(t.String())
		})

		const value = {
			name: 'salt',
			optional1: 'ok',
			// @ts-expect-error
			additional: 'b'
		} satisfies typeof shape.static

		const expected = {
			name: 'salt',
			optional1: 'ok'
		} satisfies typeof shape.static

		isEqual(shape, value, expected)
	})

	it('handle array object', () => {
		const shape = t.Array(
			t.Object({
				name: t.String()
			})
		)

		const value = [
			{
				name: 'salt',
				// @ts-expect-error
				additional: 'b'
			},
			{
				name: 'chiffon'
			}
		] satisfies typeof shape.static

		const expected = [
			{
				name: 'salt'
			},
			{
				name: 'chiffon'
			}
		] satisfies typeof shape.static

		isEqual(shape, value, expected)
	})

	it('handle array nested object', () => {
		const shape = t.Array(
			t.Object({
				name: t.String(),
				info: t.Object({
					alias: t.String()
				})
			})
		)

		const value = [
			{
				name: 'salt',
				additional: 'b',
				info: {
					alias: 'salty',
					// @ts-expect-error
					additional: 'b'
				}
			},
			{
				name: 'chiffon',
				info: {
					alias: 'chiffon'
				}
			}
		] satisfies typeof shape.static

		const expected = [
			{
				name: 'salt',
				info: {
					alias: 'salty'
				}
			},
			{
				name: 'chiffon',
				info: {
					alias: 'chiffon'
				}
			}
		] satisfies typeof shape.static

		isEqual(shape, value, expected)
	})

	it('handle intersect object', () => {
		const shape = t.Intersect([
			t.Object({
				name: t.String()
			}),
			t.Object({
				info: t.Object({
					alias: t.String()
				})
			})
		])

		const value = {
			name: 'salt',
			additional: 'b',
			info: {
				alias: 'salty',
				// @ts-expect-error
				additional: 'b'
			}
		} satisfies typeof shape.static

		const expected = {
			name: 'salt',
			info: {
				alias: 'salty'
			}
		} satisfies typeof shape.static

		isEqual(shape, value, expected)
	})
})
