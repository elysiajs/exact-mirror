import { t } from 'elysia'
import { Compile } from 'typebox/compile'

import { describe, it, expect } from 'bun:test'
import { isEqual } from './utils'

import { createMirror } from '../src'

// property names that are not plain identifiers must be bracket-accessed
// and escaped in the generated code — quotes, backslashes, newlines etc.
// previously produced a SyntaxError (or could inject into the source)
describe('Special property names', () => {
	it('handle double quote', () => {
		isEqual(t.Object({ 'a"b': t.String() }), { 'a"b': 'value' })
	})

	it('handle single quote', () => {
		isEqual(t.Object({ "a'b": t.String() }), { "a'b": 'value' })
	})

	it('handle backslash', () => {
		isEqual(t.Object({ 'a\\b': t.String() }), { 'a\\b': 'value' })
	})

	it('handle newline', () => {
		isEqual(t.Object({ 'a\nb': t.String() }), { 'a\nb': 'value' })
	})

	it('handle backtick and interpolation', () => {
		isEqual(t.Object({ 'a`${b}`c': t.String() }), { 'a`${b}`c': 'value' })
	})

	it('handle parentheses and operators', () => {
		isEqual(t.Object({ 'a(b)+c': t.String() }), { 'a(b)+c': 'value' })
	})

	it('keep handling dash and space', () => {
		isEqual(t.Object({ 'a-b': t.String(), 'a b': t.String() }), {
			'a-b': 'value',
			'a b': 'value'
		})
	})

	it('keep handling numeric-first', () => {
		isEqual(t.Object({ '0a': t.String() }), { '0a': 'value' })
	})

	it('strip unknown properties alongside special names', () => {
		const mirror = createMirror(t.Object({ 'a"b': t.String() }), {
			Compile
		})

		expect(mirror({ 'a"b': 'value', extra: 'strip-me' } as any)).toStrictEqual({
			'a"b': 'value'
		})
	})

	it('handle optional special names', () => {
		const shape = t.Object({
			'a"b': t.Optional(t.String()),
			keep: t.String()
		})

		isEqual(shape, { keep: 'value' })
		isEqual(shape, { 'a"b': 'v', keep: 'value' })
	})

	it('handle nested object under special name', () => {
		isEqual(
			t.Object({
				'a"b': t.Object({ 'c\\d': t.String() })
			}),
			{ 'a"b': { 'c\\d': 'value' } }
		)
	})

	it('apply sanitize to special-named string properties', () => {
		const mirror = createMirror(t.Object({ 'a"b': t.String() }), {
			Compile,
			sanitize: [(v) => (v === 'a' ? 'sanitized' : v)]
		})

		expect(mirror({ 'a"b': 'a' } as any)).toStrictEqual({
			'a"b': 'sanitized'
		})
	})
})
