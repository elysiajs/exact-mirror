import { t } from 'elysia'

import { describe, it } from 'bun:test'
import { isEqual } from './utils'

describe('Optional', () => {
	it('handle nested object with optional', () => {
		const shape = t.Object({
			name: t.String(),
			info: t.Object({
				alias: t.String(),
				optional1: t.Optional(t.String()),
				optional2: t.Optional(t.String())
			}),
			optional1: t.Optional(t.String()),
			optional2: t.Optional(t.String())
		})

		const value = {
			name: 'salt',
			additional: 'b',
			info: {
				alias: 'salty',
				// @ts-expect-error
				additional: 'b',
				optional2: 'ok'
			},
			optional1: 'ok',
			// @ts-expect-error
			additional: 'b'
		} satisfies typeof shape.static

		const expected = {
			name: 'salt',
			info: {
				alias: 'salty',
				optional2: 'ok'
			},
			optional1: 'ok'
		} satisfies typeof shape.static

		isEqual(shape, value, expected)
	})

	it('handle array object with optional', () => {
		const shape = t.Array(
			t.Object({
				name: t.String(),
				optional1: t.Optional(t.String()),
				optional2: t.Optional(t.String())
			})
		)

		const value = [
			{
				name: 'salt',
				optional1: 'ok',
				// @ts-expect-error
				additional: 'b'
			},
			{
				name: 'chiffon'
			}
		] satisfies typeof shape.static

		const expected = [
			{
				name: 'salt',
				optional1: 'ok'
			},
			{
				name: 'chiffon'
			}
		] satisfies typeof shape.static

		isEqual(shape, value, expected)
	})

	it('handle array nested object with optional', () => {
		const shape = t.Array(
			t.Object({
				name: t.String(),
				info: t.Object({
					alias: t.String(),
					optional1: t.Optional(t.String()),
					optional2: t.Optional(t.String())
				}),
				optional1: t.Optional(t.String()),
				optional2: t.Optional(t.String())
			})
		)

		const value = [
			{
				name: 'salt',
				additional: 'b',
				info: {
					alias: 'salty',
					// @ts-expect-error
					additional: 'b',
					optional2: 'ok'
				},
				optional1: 'ok',
				// @ts-expect-error
				additional: 'b'
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
					alias: 'salty',
					optional2: 'ok'
				},
				optional1: 'ok'
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
})
