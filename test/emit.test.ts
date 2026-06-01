import { t } from 'elysia'

import { describe, expect, it } from 'bun:test'
import { createMirror } from '../src'
import Compile from 'typebox/compile'

describe('External', () => {
	it('handle undefined unions, hof', () => {
		const shape = t.Array(t.String())

		const { unions, hof } = createMirror(shape, {
			emit: true
		})

		expect(unions).toHaveLength(0)
		expect(hof).toBeUndefined()
	})

	it('handle unions', () => {
		const shape = t.Union([t.String(), t.Number()])

		const { unions, hof } = createMirror(shape, {
			emit: true,
			Compile
		})

		expect(unions).toHaveLength(1)
		expect(hof).toBeUndefined()
	})

	it('handle hof', () => {
		const shape = t.String()

		const { unions, hof } = createMirror(shape, {
			emit: true,
			sanitize: (v) => v
		})

		expect(unions).toHaveLength(0)
		expect(hof).toBeDefined()
	})

	it('handle unions and hof', () => {
		const shape = t.Union([t.String(), t.Number()])

		const { unions, hof } = createMirror(shape, {
			emit: true,
			sanitize: (v) => v,
			Compile
		})

		expect(unions).toHaveLength(1)
		expect(hof).toBeDefined()
	})
})
