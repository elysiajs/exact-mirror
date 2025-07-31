import { Value } from '@sinclair/typebox/value'
import { TypeCompiler } from '@sinclair/typebox/compiler'
import { type TAnySchema } from '@sinclair/typebox'

import { createMirror } from '../src'

import { expect } from 'bun:test'

export const isEqual = <T extends TAnySchema>(
	shape: T,
	value: T['static'],
	expected: T['static'] = value
) =>
	expect(
		createMirror(shape, {
			TypeCompiler
		})(value)
	).toStrictEqual(expected)

export const notEqual = <T extends TAnySchema>(
	shape: T,
	value: T['static'],
	expected: T['static'] = value
) =>
	expect(
		createMirror(shape, {
			TypeCompiler
		})(value)
	).not.toStrictEqual(expected)

export const isUndefined = <T extends TAnySchema>(
	shape: T,
	value: T['static']
) =>
	expect(
		createMirror(shape, {
			TypeCompiler
		})(value)
	).toStrictEqual(undefined)

export const isEqualToTypeBox = <T extends TAnySchema>(
	shape: T,
	value: T['static'],
	expected: T['static'] = value
) =>
	expect(
		createMirror(shape, {
			TypeCompiler
		})(value)
	).toStrictEqual(Value.Clean(shape, value))
