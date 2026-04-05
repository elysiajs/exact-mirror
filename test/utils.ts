import { Value } from 'typebox/value'
import { Compile } from 'typebox/compile'
import type { Static, TSchema } from 'typebox'

import { createMirror } from '../src'

import { expect } from 'bun:test'

export const isEqual = <T extends TSchema>(
	shape: T,
	value: Static<T>,
	expected: Static<T> = value
) =>
	expect(
		createMirror(shape, {
			Compile
		})(value)
	).toStrictEqual(expected)

export const notEqual = <T extends TSchema>(
	shape: T,
	value: Static<T>,
	expected: Static<T> = value
) =>
	expect(
		createMirror(shape, {
			Compile
		})(value)
	).not.toStrictEqual(expected)

export const isUndefined = <T extends TSchema>(shape: T, value: Static<T>) =>
	expect(
		createMirror(shape, {
			Compile
		})(value)
	).toStrictEqual(undefined as any)

export const isEqualToTypeBox = <T extends TSchema>(
	shape: T,
	value: Static<T>,
	expected: Static<T> = value
) =>
	expect(
		createMirror(shape, {
			Compile
		})(value)
	).toStrictEqual(Value.Clean(shape, value) as any)
