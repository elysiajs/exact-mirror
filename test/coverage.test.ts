import { Type as t } from 'typebox'
import { Compile } from 'typebox/compile'

import { describe, it, expect } from 'bun:test'

import { createMirror } from '../src'
import { isEqual } from './utils'

describe('Optional inside array element', () => {
	it('delete a missing optional identifier property per element', () => {
		const shape = t.Array(
			t.Object({ a: t.Optional(t.String()), b: t.String() })
		)

		isEqual(shape, [{ b: 'x' }, { a: 'y', b: 'z' }])
	})

	it('delete a missing optional special-named property per element', () => {
		const shape = t.Array(
			t.Object({
				'a"b': t.Optional(t.String()),
				keep: t.String()
			})
		)

		isEqual(shape, [{ keep: 'k' }, { 'a"b': 'v', keep: 'k' }])
	})

	it('strip unknown keys alongside optionals per element', () => {
		const shape = t.Array(
			t.Object({ a: t.Optional(t.Number()), b: t.String() })
		)
		const mirror = createMirror(shape, { Compile })

		expect(
			mirror([{ b: 'x', junk: 1 }, { a: 2, b: 'y' }] as any)
		).toStrictEqual([{ b: 'x' }, { a: 2, b: 'y' }])
	})
})

describe('Union member shapes', () => {
	it('handle a union with a tuple member', () => {
		const shape = t.Union([t.Tuple([t.String(), t.Number()]), t.Null()])

		isEqual(shape, ['a', 1])
		isEqual(shape, null)
	})
})

describe('Ref resolution', () => {
	// t.Module inlines refs into concrete nodes, so a raw t.Ref + a definitions
	// map is what exercises the runtime $ref-resolution paths (standard
	// OpenAPI 3.x $ref + components style)
	const definitions = {
		item: t.Object({ id: t.Number(), name: t.String() })
	}

	it('resolve a raw $ref object property against definitions', () => {
		const shape = t.Object({ child: t.Ref('item'), s: t.String() })

		const mirror = createMirror(shape as any, {
			Compile,
			definitions: definitions as any
		})

		expect(
			mirror({
				child: { id: 1, name: 'a', junk: 9 },
				s: 'x',
				drop: 1
			} as any)
		).toStrictEqual({ child: { id: 1, name: 'a' }, s: 'x' } as any)
	})

	it('resolve a raw array of $ref objects against definitions', () => {
		const shape = t.Object({ list: t.Array(t.Ref('item')) })

		const mirror = createMirror(shape as any, {
			Compile,
			definitions: definitions as any
		})

		expect(
			mirror({
				list: [
					{ id: 1, name: 'a', junk: 9 },
					{ id: 2, name: 'b' }
				]
			} as any)
		).toStrictEqual({
			list: [
				{ id: 1, name: 'a' },
				{ id: 2, name: 'b' }
			]
		} as any)
	})

	it('mirror a non-recursive array of $ref objects via a module', () => {
		const modules = t.Module({
			root: t.Object({ items: t.Array(t.Ref('item')) }),
			item: t.Object({ id: t.Number(), name: t.String() })
		})

		const mirror = createMirror(modules.root, { Compile, modules })

		expect(
			mirror({
				items: [
					{ id: 1, name: 'a', junk: 1 },
					{ id: 2, name: 'b' }
				]
			} as any)
		).toStrictEqual({
			items: [
				{ id: 1, name: 'a' },
				{ id: 2, name: 'b' }
			]
		})
	})
})
