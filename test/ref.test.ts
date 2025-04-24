import { t } from 'elysia'

import createMirror from '../src'

import { TypeCompiler } from '@sinclair/typebox/compiler'

import { describe, it, expect } from 'bun:test'
import { isEqual } from './utils'

describe('Ref', () => {
	it('handle module', () => {
		const modules = t.Module({
			object: t.Object({
				name: t.String(),
				optional: t.Optional(t.String())
			})
		})

		const shape = modules.Import('object')

		const value = {
			name: 'salt'
		} satisfies typeof shape.static

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

		const shape = modules.Import('object')

		const value = {
			name: 'salt',
			info: {
				id: 123,
				name: 'salt'
			}
		} satisfies typeof shape.static

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

		const shape = modules.Import('object')

		const value = {
			name: 'salt'
		} satisfies typeof shape.static

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
		} satisfies typeof shape.static

		expect(
			createMirror(shape, {
				definitions
			})(value)
		).toEqual(value)
	})

	it('handle recursion', () => {
		const shape = t.Module({
			a: t.Object({ type: t.String(), a: t.Nullable(t.Ref('a')) })
		})

		const actual = shape.Import('a')

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
				TypeCompiler,
				modules: shape
			})(value)
		).toEqual(value)
	})

	it('handle recusion array', () => {
		const shape = t.Module({
			a: t.Object({ type: t.String(), a: t.Array(t.Ref('a')) })
		})

		const actual = shape.Import('a')

		const value = {
			type: 'a',
			a: [
				{ type: 'a', a: [{ type: 'a', a: [] }] },
				{ type: 'a', a: [{ type: 'a', a: [] }] }
			]
		} satisfies typeof actual.static

		expect(
			createMirror(actual, {
				TypeCompiler,
				modules: shape
			})(value)
		).toEqual(value)
	})

	it('handle', () => {
		const shape = t.Module({
			a: t.Object({
				type: t.String(),
				data: t.Union([t.Nullable(t.Ref('a')), t.Array(t.Ref('a'))])
			})
		})

		const actual = shape.Import('a')

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
		} satisfies typeof actual.static

		expect(
			createMirror(actual, {
				TypeCompiler,
				modules: shape
			})(value)
		).toEqual(value)
	})
})
