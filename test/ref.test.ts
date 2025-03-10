import { t } from 'elysia'

import createMirror from '../src'

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
})
