import { Type as t } from 'typebox'
import { Compile } from 'typebox/compile'

import { describe, expect, it } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { createMirror } from '../src'

// An absent optional key is left out while the object is built, it is not
// deleted afterward: on V8 a delete puts the object in dictionary mode.
// These pin that building key by key still returns the same keys in the
// same order as the schema.
describe('absent optional keys', () => {
	it('keep schema order around an absent key', () => {
		const mirror = createMirror(
			t.Object({
				a: t.String(),
				b: t.Optional(t.String()),
				c: t.Number(),
				d: t.Optional(t.Number())
			})
		)

		const some = mirror({ d: 1, c: 2, a: 'a', extra: 1 } as any)
		expect(some).toStrictEqual({ a: 'a', c: 2, d: 1 })
		expect(Object.keys(some)).toEqual(['a', 'c', 'd'])

		// a present optional key before a required one keeps its place
		const between = mirror({ c: 2, b: 'b', a: 'a' })
		expect(between).toStrictEqual({ a: 'a', b: 'b', c: 2 })
		expect(Object.keys(between)).toEqual(['a', 'b', 'c'])

		const all = mirror({ d: 1, c: 2, b: 'b', a: 'a' })
		expect(Object.keys(all)).toEqual(['a', 'b', 'c', 'd'])
	})

	it('leave out a key that is present but undefined', () => {
		const mirror = createMirror(
			t.Object({ a: t.String(), b: t.Optional(t.String()) })
		)

		const value = mirror({ a: 'a', b: undefined })
		expect(value).toStrictEqual({ a: 'a' })
		expect('b' in value).toBe(false)
	})

	it('leave out an absent nested object and its absent keys', () => {
		const mirror = createMirror(
			t.Object({
				name: t.String(),
				meta: t.Optional(
					t.Object({
						x: t.Optional(t.Number()),
						y: t.String(),
						list: t.Array(t.Object({ k: t.String() }))
					})
				),
				email: t.Optional(t.String())
			})
		)

		expect(Object.keys(mirror({ name: 'a' }))).toEqual(['name'])

		const value = mirror({
			email: 'e',
			meta: { list: [], y: 'y' },
			name: 'a'
		})
		expect(value).toStrictEqual({
			name: 'a',
			meta: { y: 'y', list: [] },
			email: 'e'
		})
		expect(Object.keys(value)).toEqual(['name', 'meta', 'email'])
	})

	it('decide per array item', () => {
		const mirror = createMirror(
			t.Array(t.Object({ id: t.Number(), tag: t.Optional(t.String()) }))
		)

		const value = mirror([{ id: 1 }, { tag: 't', id: 2 }, { id: 3 }])
		expect(value).toStrictEqual([{ id: 1 }, { id: 2, tag: 't' }, { id: 3 }])
		expect(value.map((item) => Object.keys(item))).toEqual([
			['id'],
			['id', 'tag'],
			['id']
		])
	})

	it('leave out an absent key of a union member', () => {
		const mirror = createMirror(
			t.Object({
				u: t.Union([
					t.Object({
						kind: t.Literal('a'),
						x: t.Optional(t.String())
					}),
					t.Object({
						kind: t.Literal('b'),
						y: t.Optional(t.Number())
					})
				])
			}),
			{ Compile }
		)

		expect(mirror({ u: { kind: 'b' } })).toStrictEqual({ u: { kind: 'b' } })
		expect(mirror({ u: { y: 1, kind: 'b' } })).toStrictEqual({
			u: { kind: 'b', y: 1 }
		})
	})

	// the key is present on the input but its decoded value is undefined,
	// so it can only be left out by looking at the output
	it('leave out a union key that decodes to undefined', () => {
		const MaybeEmpty = t.Union([
			t
				.Codec(t.String())
				.Decode((v: string) => (v === '' ? undefined : v))
				.Encode((v: string | undefined) => v ?? ''),
			t.Number()
		])

		const mirror = createMirror(
			t.Object({
				a: t.String(),
				e: MaybeEmpty,
				list: t.Array(t.Object({ e: MaybeEmpty, f: t.Number() }))
			}),
			{ Compile, decode: true }
		)

		const value = mirror({ a: 'a', e: '', list: [{ e: '', f: 1 }] } as any)
		// decoded to undefined, the required key is left out
		expect(value).toStrictEqual({ a: 'a', list: [{ f: 1 }] } as any)
		expect('e' in value).toBe(false)
		expect('e' in value.list[0]).toBe(false)

		expect(
			mirror({ a: 'a', e: 'x', list: [{ e: 'y', f: 1 }] } as any)
		).toStrictEqual({ a: 'a', e: 'x', list: [{ e: 'y', f: 1 }] })
	})
})

// Building key by key moves code around: these pin that transforms and
// reads still run in schema order, once, as a single object literal would.
describe('build order', () => {
	it('run transforms in schema order across a nested object', () => {
		const shape = t.Object({
			a: t.String(),
			b: t.Object({ c: t.Optional(t.String()) })
		})
		const input = { a: 'a', b: { c: 'c' } }

		let calls = 0
		const sanitize = (v: string) => v + ++calls
		expect(createMirror(shape, { sanitize })(input)).toStrictEqual({
			a: 'a1',
			b: { c: 'c2' }
		})

		const seen: string[] = []
		const Traced = t
			.Codec(t.String())
			.Decode((v: string) => {
				seen.push(v)
				if (v === 'a') throw new Error('stop')

				return v
			})
			.Encode((v: string) => v)

		const decode = createMirror(
			t.Object({ a: Traced, b: t.Object({ c: t.Optional(Traced) }) }),
			{ decode: true }
		)

		// a throw stops every later key, as it would in a literal
		expect(() => decode(input)).toThrow('stop')
		expect(seen).toEqual(['a'])
	})

	it('read a key before a later key is transformed', () => {
		const input = { a: 1, b: 'b' }
		const mirror = createMirror(
			t.Object({ a: t.Optional(t.Number()), b: t.String() }),
			{
				sanitize: (v: string) => {
					input.a = 2

					return v
				}
			}
		)

		expect(mirror(input)).toStrictEqual({ a: 1, b: 'b' })
	})

	// 1.2.6 read an optional key up to 3 times and decided on the last read
	it('read an optional key once', () => {
		let reads = 0
		const input = {
			get a() {
				return ++reads === 1 ? 42 : undefined
			}
		}

		const mirror = createMirror(t.Object({ a: t.Optional(t.Number()) }))

		expect(mirror(input)).toStrictEqual({ a: 42 })
		expect(reads).toBe(1)
	})

	// presence is decided on that one read: 1.2.6 read the input again after
	// every transform, so a later transform deleting the key dropped it
	it('keep a key a later transform deletes from the input', () => {
		const input: { a?: string; b: string } = { a: 'a', b: 'b' }
		const mirror = createMirror(
			t.Object({ a: t.Optional(t.String()), b: t.String() }),
			{
				sanitize: (v: string) => {
					if (v === 'b') delete input.a

					return v
				}
			}
		)

		expect(mirror(input)).toStrictEqual({ a: 'a', b: 'b' })
	})

	it('define keys after a `__proto__` key sets a prototype', () => {
		const calls: unknown[] = []
		const proto = {
			set x(value: unknown) {
				calls.push(value)
			}
		}
		const input = { x: 42 }
		Object.defineProperty(input, '__proto__', {
			value: proto,
			enumerable: true,
			writable: true,
			configurable: true
		})

		const value = createMirror(
			t.Object({
				['__proto__']: t.Any(),
				x: t.Number(),
				missing: t.Optional(t.String())
			})
		)(input as any) as any

		expect(Object.getPrototypeOf(value)).toBe(proto)
		expect(Object.hasOwn(value, 'x')).toBe(true)
		expect(value.x).toBe(42)
		expect(calls).toEqual([])
	})

	it('define a key that Object.prototype has a setter for', () => {
		const calls: unknown[] = []
		Object.defineProperty(Object.prototype, 'victim', {
			configurable: true,
			set(value) {
				calls.push(value)
			}
		})

		try {
			const mirror = createMirror(
				t.Object({ victim: t.String(), absent: t.Optional(t.String()) })
			)
			const value = mirror({ victim: 'kept' } as any)

			expect(Object.hasOwn(value, 'victim')).toBe(true)
			expect(value.victim).toBe('kept')
			expect(calls).toEqual([])
		} finally {
			delete (Object.prototype as any).victim
		}
	})

	it('define a built-in key on a frozen Object.prototype', () => {
		// a sloppy-mode assignment to a frozen inherited key fails silently
		const result = Bun.spawnSync(
			[
				process.execPath,
				'--eval',
				`import { Type as t } from 'typebox'
			import { createMirror } from ${JSON.stringify(join(import.meta.dir, '../src/index.ts'))}

			const mirror = createMirror(t.Object({
				name: t.String(),
				constructor: t.Optional(t.String()),
				toString: t.String(),
				absent: t.Optional(t.String())
			}))
			Object.freeze(Object.prototype)

			console.log(JSON.stringify(mirror({ name: 'n', constructor: 'c', toString: 's' })))`
			],
			{ cwd: join(import.meta.dir, '..') }
		)

		expect(result.stderr.toString()).toBe('')
		expect(JSON.parse(result.stdout.toString())).toEqual({
			name: 'n',
			constructor: 'c',
			toString: 's'
		})
	})
})

const node = Bun.which('node')

describe('V8 fast properties', () => {
	it.skipIf(!node)(
		'keep mirror output out of dictionary mode on Node',
		async () => {
			const dir = mkdtempSync(join(tmpdir(), 'exact-mirror-'))

			try {
				const build = await Bun.build({
					entrypoints: [join(import.meta.dir, '../src/index.ts')],
					outdir: dir,
					naming: 'index.mjs',
					target: 'node',
					format: 'esm'
				})
				expect(build.success).toBe(true)

				const result = Bun.spawnSync([
					node!,
					'--allow-natives-syntax',
					join(import.meta.dir, 'node/fast-properties.mjs'),
					join(dir, 'index.mjs')
				])

				expect(result.stderr.toString()).toBe('')
				expect(result.exitCode).toBe(0)
			} finally {
				rmSync(dir, { recursive: true, force: true })
			}
		}
	)
})
