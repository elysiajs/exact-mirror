import { Type as t } from 'typebox'
import { Compile } from 'typebox/compile'

import { describe, expect, it } from 'bun:test'

import { createMirror } from '../src'

const escape = (v: string) => v.replaceAll('<', '&lt;')

// sanitize is what stands between user input and a template, so a string
// reaching the handler raw because of where it sits in the schema is a hole
describe('sanitize in an array', () => {
	const cases: [string, any, unknown, unknown][] = [
		['root', t.Array(t.String()), ['<b>'], ['&lt;b>']],
		[
			'property',
			t.Object({ a: t.Array(t.String()) }),
			{ a: ['<b>'] },
			{ a: ['&lt;b>'] }
		],
		[
			'optional property',
			t.Object({ a: t.Optional(t.Array(t.String())) }),
			{ a: ['<b>'] },
			{ a: ['&lt;b>'] }
		],
		[
			'nested array',
			t.Object({ a: t.Array(t.Array(t.String())) }),
			{ a: [['<b>'], ['<i>']] },
			{ a: [['&lt;b>'], ['&lt;i>']] }
		],
		[
			'array in an array of objects',
			t.Array(t.Object({ a: t.Array(t.String()) })),
			[{ a: ['<b>'] }],
			[{ a: ['&lt;b>'] }]
		],
		[
			'tuple element',
			t.Object({ a: t.Tuple([t.Array(t.String())]) }),
			{ a: [['<b>']] },
			{ a: [['&lt;b>']] }
		],
		[
			'record value',
			t.Record(t.String(), t.Array(t.String())),
			{ a: ['<b>'] },
			{ a: ['&lt;b>'] }
		],
		[
			'union member',
			t.Object({ a: t.Union([t.Array(t.String()), t.Number()]) }),
			{ a: ['<b>'] },
			{ a: ['&lt;b>'] }
		]
	]

	for (const [name, schema, input, output] of cases)
		it(`reach the items of a ${name}`, () => {
			expect(
				createMirror(schema, { Compile, sanitize: escape })(
					input as any
				)
			).toEqual(output)
		})

	it('reach a string behind a reference', () => {
		const definition = t.String({ $id: 'text' })
		const mirror = createMirror(t.Array(t.Ref('text')), {
			Compile,
			modules: { $defs: { text: definition } } as any,
			sanitize: escape
		})

		expect(mirror(['<b>'] as any)).toEqual(['&lt;b>'])
	})

	it('reach a string behind a chain of references', () => {
		const mirror = createMirror(t.Array(t.Ref('alias')), {
			Compile,
			modules: {
				$defs: {
					alias: t.Ref('text'),
					text: t.String()
				}
			} as any,
			sanitize: escape
		})

		expect(mirror(['<b>'] as any)).toEqual(['&lt;b>'])
	})

	it('reach a string in a cyclic definition', () => {
		const mirror = createMirror(
			t.Array(t.Cyclic({ text: t.String() }, 'text')),
			{
				Compile,
				sanitize: escape
			}
		)

		expect(mirror(['<b>'] as any)).toEqual(['&lt;b>'])
	})

	// the identity shortcut let these through, a validator rejects them after
	it('leave a value that is not an array as is', () => {
		const root = createMirror(t.Array(t.String()), {
			Compile,
			sanitize: escape
		})
		const nested = createMirror(t.Object({ a: t.Array(t.String()) }), {
			Compile,
			sanitize: escape
		})

		expect(root(null as any)).toBe(null as any)
		expect(root('<b>' as any)).toBe('<b>' as any)
		expect(nested({ a: null } as any)).toEqual({ a: null } as any)
		expect(nested({ a: '<b>' } as any)).toEqual({ a: '<b>' } as any)
	})

	it('apply every sanitizer in order once per item', () => {
		const mirror = createMirror(t.Array(t.String()), {
			Compile,
			sanitize: [(v) => v + 'a', (v) => v + 'b']
		})

		expect(mirror(['x', 'y'])).toEqual(['xab', 'yab'])
	})

	it('leave an array it cannot change as is', () => {
		const list = [1, 2]
		const mirror = createMirror(t.Array(t.Number()), {
			Compile,
			sanitize: escape
		})

		// the identity shortcut is the fast path: only a string needs the loop
		expect(mirror(list)).toBe(list)
	})

	it('keep the identity shortcut without sanitize', () => {
		const list = ['<b>']

		expect(createMirror(t.Array(t.String()), { Compile })(list)).toBe(list)
	})

	it('skip literals like a property does', () => {
		const mirror = createMirror(t.Array(t.Literal('<b>')), {
			Compile,
			sanitize: escape
		})

		expect(mirror(['<b>'])).toEqual(['<b>'])

		const empty = createMirror(t.Object({ a: t.Literal('') }), {
			Compile,
			sanitize: (v) => v + '!'
		})

		expect(empty({ a: '' })).toEqual({ a: '' })
	})
})
