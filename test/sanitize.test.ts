import { t } from 'elysia'

import { describe, expect, it } from 'bun:test'
import createMirror from '../src'

describe('sanitize', () => {
	it('handle single sanitizer', () => {
		const shape = t.Object({
			hello: t.String(),
			world: t.String()
		})

		const value = {
			hello: 'Hello',
			world: 'World'
		} satisfies typeof shape.static

		expect(
			createMirror(shape, {
				sanitize: [(v) => (v === 'Hello' ? 'Hi' : v)]
			})(value)
		).toEqual({
			hello: 'Hi',
			world: 'World'
		})
	})

	it('handle multiple sanitizers', () => {
		const shape = t.Object({
			hello: t.String(),
			world: t.String()
		})

		const value = {
			hello: 'Hello',
			world: 'World'
		} satisfies typeof shape.static

		expect(
			createMirror(shape, {
				sanitize: [
					(v) => (v === 'Hello' ? 'Hi' : v),
					(v) => (v === 'World' ? 'Salty' : v)
				]
			})(value)
		).toEqual({
			hello: 'Hi',
			world: 'Salty'
		})
	})

	it('handle sanitize as function', () => {
		const shape = t.Object({
			hello: t.String(),
			world: t.String()
		})

		const value = {
			hello: 'Hello',
			world: 'World'
		} satisfies typeof shape.static

		expect(
			createMirror(shape, {
				sanitize: (v) => (v === 'Hello' ? 'Hi' : v)
			})(value)
		).toEqual({
			hello: 'Hi',
			world: 'World'
		})
	})
})
