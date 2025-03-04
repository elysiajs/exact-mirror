import { t } from 'elysia'

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
	).toEqual(expected)

export const notEqual = <T extends TAnySchema>(
	shape: T,
	value: T['static'],
	expected: T['static'] = value
) =>
	expect(
		createMirror(shape, {
			TypeCompiler
		})(value)
	).not.toEqual(expected)

export const isUndefined = <T extends TAnySchema>(
	shape: T,
	value: T['static']
) =>
	expect(
		createMirror(shape, {
			TypeCompiler
		})(value)
	).toEqual(undefined)

export const isEqualToTypeBox = <T extends TAnySchema>(
	shape: T,
	value: T['static'],
	expected: T['static'] = value
) =>
	expect(
		createMirror(shape, {
			TypeCompiler
		})(value)
	).toEqual(Value.Clean(shape, value))
