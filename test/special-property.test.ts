import { t } from 'elysia'
import { TypeCompiler } from '@sinclair/typebox/compiler'

import { describe, expect, it } from 'bun:test'

import { createMirror } from '../src'

describe('Special property names', () => {
	it('treat property names as data', () => {
		const marker = '__exactMirrorPropertyCodegen'
		const field = `v,b:(${marker}=true),v`

		delete (globalThis as Record<string, unknown>)[marker]

		const mirror = createMirror(t.Object({ [field]: t.String() }), {
			TypeCompiler
		})

		expect(mirror({ [field]: 'safe' } as any)).toEqual({ [field]: 'safe' })
		expect((globalThis as Record<string, unknown>)[marker]).toBeUndefined()
	})

	it('escape quotes, backslashes, and newlines', () => {
		const schema = t.Object({
			'a"b': t.String(),
			'a\\b': t.String(),
			'a\nb': t.String()
		})
		const mirror = createMirror(schema, { TypeCompiler })
		const value = { 'a"b': 'quote', 'a\\b': 'slash', 'a\nb': 'newline' }

		expect(mirror(value)).toEqual(value)
	})
})
