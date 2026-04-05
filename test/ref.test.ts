import createMirror from '../src'

import { Static, Type as t } from 'typebox'
import { Compile } from 'typebox/compile'

import { describe, it, expect } from 'bun:test'
import { isEqual } from './utils'

const Nullable = <T extends t.TSchema>(schema: T) => t.Union([schema, t.Null()])

describe('Ref', () => {
	it('handle module', () => {
		const modules = t.Module({
			object: t.Object({
				name: t.String(),
				optional: t.Optional(t.String())
			})
		})

		const shape = modules.object

		const value = {
			name: 'salt'
		} satisfies Static<typeof shape>

		isEqual(shape, value)
	})

	it('handle nested ref', () => {
		const modules = t.Module({
			object: t.Object({
				name: t.String(),
				info: t.Ref('info')
			}),
			info: t.Object({
				id: t.Number(),
				name: t.String()
			})
		})

		const shape = modules.object

		const value = {
			name: 'salt',
			info: {
				id: 123,
				name: 'salt'
			}
		} satisfies Static<typeof shape>

		isEqual(shape, value)
	})

	it('handle optional ref', () => {
		const modules = t.Module({
			object: t.Object({
				name: t.String(),
				info: t.Optional(t.Ref('info'))
			}),
			info: t.Object({
				id: t.Number(),
				name: t.String()
			})
		})

		const shape = modules.object

		const value = {
			name: 'salt'
		} satisfies Static<typeof shape>

		isEqual(shape, {
			name: 'salt'
		})

		isEqual(shape, {
			name: 'salt',
			info: {
				id: 123,
				name: 'salt'
			}
		})
	})

	it('handle custom modules', () => {
		const definitions = {
			object: t.Object({
				name: t.String(),
				optional: t.Optional(t.String())
			})
		}

		const shape = definitions.object

		const value = {
			name: 'salt'
		} satisfies Static<typeof shape>

		expect(
			createMirror(shape, {
				definitions
			})(value)
		).toEqual(value)
	})

	it('handle recursion', () => {
		const shape = t.Module({
			a: t.Object({ type: t.String(), a: Nullable(t.Ref('a')) })
		})

		const actual = shape.a

		const value = {
			type: 'a',
			a: {
				type: 'a',
				a: {
					type: 'a',
					a: null
				}
			}
		} satisfies typeof actual.static

		expect(
			createMirror(actual, {
				Compile,
				modules: shape
			})(value)
		).toEqual(value)
	})

	it('handle recusion array', () => {
		const shape = t.Module({
			a: t.Object({ type: t.String(), a: t.Array(t.Ref('a')) })
		})

		const actual = shape.a

		const value = {
			type: 'a',
			a: [
				{ type: 'a', a: [{ type: 'a', a: [] }] },
				{ type: 'a', a: [{ type: 'a', a: [] }] }
			]
		} satisfies Static<typeof actual>

		expect(
			createMirror(actual, {
				Compile,
				modules: shape
			})(value)
		).toEqual(value)
	})

	it('handle Import', () => {
		const shape = t.Module({
			a: t.Object({
				type: t.String(),
				data: t.Union([Nullable(t.Ref('a')), t.Array(t.Ref('a'))])
			})
		})

		const actual = shape.a

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
		} satisfies Static<typeof actual>

		expect(
			createMirror(actual, {
				Compile,
				modules: shape
			})(value)
		).toEqual(value)
	})
})
