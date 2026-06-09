import createMirror from '../src'

import { Type as t } from 'typebox'
import { Compile } from 'typebox/compile'

import { describe, it, expect } from 'bun:test'

const node = t.Cyclic(
	{
		a: t.Object({
			type: t.String(),
			data: t.Union([t.Ref('a'), t.Null()])
		})
	},
	'a'
)

describe('Cyclic', () => {
	it('strip unknown properties at every level', () => {
		const mirror = createMirror(node as any, { Compile })

		expect(
			mirror({
				type: 'a',
				extra: 'x',
				data: {
					type: 'b',
					extra: 'x',
					data: {
						type: 'c',
						extra: 'x',
						data: null
					}
				}
			} as any)
		).toEqual({
			type: 'a',
			data: {
				type: 'b',
				data: {
					type: 'c',
					data: null
				}
			}
		})
	})

	it('apply sanitize beyond previous recursion limit', () => {
		const mirror = createMirror(node as any, {
			Compile,
			sanitize: (v) => (v === 'dirty' ? 'CLEAN' : v)
		})

		let value: any = { type: 'dirty', data: null }
		for (let i = 0; i < 12; i++) value = { type: 'ok', data: value }

		let result = mirror(value) as any
		for (let i = 0; i < 12; i++) result = result.data

		expect(result.type).toBe('CLEAN')
	})

	it('handle mutual recursion between definitions', () => {
		const schema = t.Cyclic(
			{
				a: t.Object({
					name: t.String(),
					b: t.Union([t.Ref('b'), t.Null()])
				}),
				b: t.Object({
					id: t.Number(),
					a: t.Union([t.Ref('a'), t.Null()])
				})
			},
			'a'
		)

		const mirror = createMirror(schema as any, { Compile })

		expect(
			mirror({
				name: 'a1',
				extra: 'x',
				b: {
					id: 1,
					extra: 'x',
					a: { name: 'a2', extra: 'x', b: null }
				}
			} as any)
		).toEqual({
			name: 'a1',
			b: {
				id: 1,
				a: { name: 'a2', b: null }
			}
		})
	})

	it('handle cyclic reference in array', () => {
		const schema = t.Cyclic(
			{
				a: t.Object({
					type: t.String(),
					children: t.Array(t.Ref('a'))
				})
			},
			'a'
		)

		const mirror = createMirror(schema as any, { Compile })

		expect(
			mirror({
				type: 'root',
				extra: 'x',
				children: [
					{ type: 'leaf', extra: 'x', children: [] },
					{
						type: 'branch',
						children: [{ type: 'leaf', extra: 'x', children: [] }]
					}
				]
			} as any)
		).toEqual({
			type: 'root',
			children: [
				{ type: 'leaf', children: [] },
				{
					type: 'branch',
					children: [{ type: 'leaf', children: [] }]
				}
			]
		})
	})

	// definition body that is itself an array of refs at its own root
	it('handle definition that is an array of cyclic references', () => {
		const schema = t.Cyclic(
			{
				node: t.Object({
					type: t.String(),
					children: t.Ref('list')
				}),
				list: t.Array(t.Ref('node'))
			},
			'node'
		)

		const mirror = createMirror(schema as any, { Compile })

		expect(
			mirror({
				type: 'root',
				extra: 'x',
				children: [{ type: 'leaf', extra: 'x', children: [] }]
			} as any)
		).toEqual({
			type: 'root',
			children: [{ type: 'leaf', children: [] }]
		})
	})

	it('handle cyclic reference in record', () => {
		const schema = t.Cyclic(
			{
				a: t.Object({
					type: t.String(),
					data: t.Record(t.String(), t.Ref('a'))
				})
			},
			'a'
		)

		const mirror = createMirror(schema as any, { Compile })

		expect(
			mirror({
				type: 'root',
				extra: 'x',
				data: {
					x: { type: 'child', extra: 'x', data: {} }
				}
			} as any)
		).toEqual({
			type: 'root',
			data: {
				x: { type: 'child', data: {} }
			}
		})
	})

	it('handle cyclic schema nested in object property', () => {
		const schema = t.Object({
			name: t.String(),
			node
		})

		const mirror = createMirror(schema as any, { Compile })

		expect(
			mirror({
				name: 'salt',
				extra: 'x',
				node: {
					type: 'a',
					extra: 'x',
					data: { type: 'b', extra: 'x', data: null }
				}
			} as any)
		).toEqual({
			name: 'salt',
			node: {
				type: 'a',
				data: { type: 'b', data: null }
			}
		})
	})

	it('delete optional cyclic reference when undefined', () => {
		const schema = t.Cyclic(
			{
				a: t.Object({
					type: t.String(),
					data: t.Optional(t.Ref('a'))
				})
			},
			'a'
		)

		const mirror = createMirror(schema as any, { Compile })

		expect(
			mirror({
				type: 'a',
				data: { type: 'b' }
			} as any)
		).toEqual({
			type: 'a',
			data: { type: 'b' }
		})

		expect(mirror({ type: 'a', extra: 'x' } as any)).toEqual({
			type: 'a'
		})
	})

	// emitted source embeds as `function(d){<source>}` (externals) or
	// `function(v){<source>}` (plain), definition functions must stay
	// inside that body
	it('emit cyclic mirror source', () => {
		const { source, externals } = createMirror(node as any, {
			Compile,
			emit: true
		}) as any

		expect(source).toBeString()

		const mirror = Function('d', source)(externals)

		expect(mirror({ type: 'a', extra: 'x', data: null })).toEqual({
			type: 'a',
			data: null
		})
	})

	it('emit cyclic mirror source without externals', () => {
		const schema = t.Cyclic(
			{
				a: t.Object({
					type: t.String(),
					data: t.Optional(t.Ref('a'))
				})
			},
			'a'
		)

		const { source, externals } = createMirror(schema as any, {
			emit: true
		}) as any

		expect(source).toBeString()
		expect(externals).toBeUndefined()

		const mirror = Function('v', source)

		expect(mirror({ type: 'a', extra: 'x' })).toEqual({ type: 'a' })
	})

	// the previous strategy took 13 seconds creating a mirror for this
	// schema at the default recursion limit
	it('create mirror for union-heavy cyclic schema quickly', () => {
		const schema = t.Cyclic(
			{
				a: t.Object({
					type: t.String(),
					data: t.Union([
						t.Union([t.Ref('a'), t.Null()]),
						t.Array(t.Ref('a'))
					])
				})
			},
			'a'
		)

		const start = performance.now()
		const mirror = createMirror(schema as any, { Compile })
		expect(performance.now() - start).toBeLessThan(1000)

		expect(
			mirror({
				type: 'yea',
				extra: 'x',
				data: {
					type: 'ok',
					extra: 'x',
					data: [
						{
							type: 'cool',
							extra: 'x',
							data: null
						}
					]
				}
			} as any)
		).toEqual({
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
		})
	})
})
