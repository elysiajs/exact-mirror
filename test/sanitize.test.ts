import { t } from 'elysia'
import { TypeCompiler } from '@sinclair/typebox/compiler'

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

	it('handle top-level string', () => {
		const shape = t.String()

		const value = 'Hello' satisfies typeof shape.static

		expect(
			createMirror(shape, {
				sanitize: (v) => (v === 'Hello' ? 'Hi' : v)
			})(value)
		).toBe('Hi')
	})

	it('handle nested string', () => {
		const shape = t.Object({
			hello: t.String(),
			detail: t.Object({
				world: t.String()
			})
		})

		const value = {
			hello: 'Hello',
			detail: { world: 'World' }
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
			detail: {
				world: 'Salty'
			}
		})
	})

	it('handle union', async () => {
		const shape = t.Object({
			hello: t.String(),
			detail: t.Union([
				t.Object({
					world: t.String()
				}),
				t.Object({
					world2: t.String()
				})
			])
		})

		const mirror = createMirror(shape, {
			sanitize: [
				(v) => (v === 'Hello' ? 'Hi' : v),
				(v) => (v === 'World' ? 'Salty' : v)
			],
			TypeCompiler
		})

		const value1 = {
			hello: 'Hello',
			detail: { world: 'World' }
		} satisfies typeof shape.static

		expect(mirror(value1)).toEqual({
			hello: 'Hi',
			detail: {
				world: 'Salty'
			}
		})

		const value2 = {
			hello: 'Hello',
			detail: { world2: 'World' }
		} satisfies typeof shape.static

		expect(mirror(value2)).toEqual({
			hello: 'Hi',
			detail: {
				world2: 'Salty'
			}
		})
	})
})
