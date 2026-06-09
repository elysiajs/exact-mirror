import createMirror from '../src'

import { Type as t } from 'typebox'
import { Compile } from 'typebox/compile'

import { describe, it, expect, spyOn } from 'bun:test'

describe('Unsupported node fallback', () => {
	// regression: elysia's t.ArrayString() is a union containing an
	// items-less array schema — dereferencing schema.items.type crashed
	// codegen, killing the whole mirror and leaving the route with no
	// normalization at all
	it('handle union member without items inside array items', () => {
		const shape = t.Object({
			ids: {
				type: 'array',
				items: {
					anyOf: [
						{ type: 'string' },
						{ anyOf: [{ type: 'array' }, { type: 'string' }] }
					]
				}
			} as any
		})

		const mirror = createMirror(shape, { Compile })

		expect(
			mirror({
				ids: ['a', ['b']],
				extra: 'should-be-stripped'
			} as any)
		).toEqual({
			ids: ['a', ['b']]
		})
	})

	it('handle array schema without items', () => {
		const shape = t.Object({
			ids: { type: 'array' } as any,
			name: t.String()
		})

		const mirror = createMirror(shape)

		expect(
			mirror({
				ids: [1, 'a'],
				name: 'salt',
				extra: 'should-be-stripped'
			} as any)
		).toEqual({
			ids: [1, 'a'],
			name: 'salt'
		})
	})

	it('handle object schema without properties', () => {
		const shape = t.Object({
			meta: { type: 'object' } as any,
			name: t.String()
		})

		const mirror = createMirror(shape)

		expect(
			mirror({
				meta: { anything: 'goes' },
				name: 'salt',
				extra: 'should-be-stripped'
			} as any)
		).toEqual({
			meta: { anything: 'goes' },
			name: 'salt'
		})
	})

	// an unsupported node must degrade only its own subtree to identity —
	// loudly, via console.warn — while the rest of the mirror keeps stripping
	it('degrade unsupported node to identity instead of failing whole mirror', () => {
		const warn = spyOn(console, 'warn').mockImplementation(() => {})

		try {
			const shape = t.Object({
				// Record kind without patternProperties crashes handleRecord
				weird: { type: 'object', '~kind': 'Record' } as any,
				name: t.String()
			})

			const mirror = createMirror(shape)

			expect(
				mirror({
					weird: { anything: 'goes' },
					name: 'salt',
					extra: 'should-be-stripped'
				} as any)
			).toEqual({
				weird: { anything: 'goes' },
				name: 'salt'
			})

			expect(warn).toHaveBeenCalled()
		} finally {
			warn.mockRestore()
		}
	})
})
