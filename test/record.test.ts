import { Type as t } from 'typebox'

import { describe, it, expect } from 'bun:test'
import { isEqual } from './utils'
import { createMirror } from '../src'

describe('Record', () => {
	it('handle record', () => {
		const shape = t.Record(t.String(), t.String())

		isEqual(shape, {
			a: 'a',
			b: 'b'
		})
		isEqual(shape, { a: 'a', b: 'b' })
	})

	it('handle record object', () => {
		const shape = t.Record(
			t.String(),
			t.Object({
				a: t.String(),
				b: t.Optional(t.String())
			})
		)

		isEqual(
			shape,
			{
				a: { a: 'a' },
				b: { a: 'a', b: 'b' },
				// @ts-expect-error
				c: { a: 'a', b: 'b', c: 'c' }
			},
			{
				a: { a: 'a' },
				b: { a: 'a', b: 'b' },
				c: { a: 'a', b: 'b' }
			}
		)
	})

	it('handle record array', () => {
		const shape = t.Record(t.String(), t.Array(t.String()))

		isEqual(shape, {
			a: ['a'],
			b: ['a', 'b']
		})
		isEqual(shape, { a: ['a'], b: ['a', 'b'] })
	})

	it('handle nested record', () => {
		const shape = t.Record(t.String(), t.Record(t.String(), t.String()))

		isEqual(shape, {
			a: { a: 'a' },
			b: { a: 'a', b: 'b' }
		})
		isEqual(shape, { a: { a: 'a' }, b: { a: 'a', b: 'b' } })
	})

	// A record's keys come from the value, so `__proto__` can be one of them.
	// Assigning it onto a normal accumulator invokes `Object.prototype`'s
	// `__proto__` setter, which would let the input choose the output's
	// prototype — a prototype-hijack primitive for any consumer that dispatches
	// on `constructor.name` or reads inherited properties.
	it('does not let a `__proto__` key hijack the output prototype', () => {
		const shape = t.Record(t.String(), t.String())
		const clean = createMirror(shape)

		const hostile = JSON.parse(
			'{"__proto__":{"constructor":{"name":"Hijacked"}},"a":"b"}'
		)
		const value = clean(hostile) as Record<string, unknown>

		expect(Object.getPrototypeOf(value)).toBe(Object.prototype)
		expect((value as any).constructor.name).toBe('Object')

		// the key survives as ordinary data rather than being swallowed
		expect(Object.prototype.hasOwnProperty.call(value, '__proto__')).toBe(
			true
		)
		expect(JSON.parse(JSON.stringify(value))).toEqual(hostile)

		// and nothing leaked onto the global prototype
		expect(({} as any).constructor.name).toBe('Object')
	})
})
