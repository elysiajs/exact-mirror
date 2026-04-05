import { expect, test, describe } from 'bun:test'
import { Type } from 'typebox'
import { Compile } from 'typebox/compile'
import { createMirror } from '../src/index'

const TDate = () =>
	Type.Encode(
		Type.Union([
			Type.Refine(
				Type.Unsafe<Date>({ '~kind': 'Date' }),
				(value) => value instanceof Date,
				'must be Date'
			),
			Type.Decode(
				Type.Union([
					Type.String({
						format: 'date',
						default: new Date(0).toISOString()
					}),
					Type.String({
						format: new Date(0).toISOString()
					})
				]),
				(value) => new Date(value)
			)
		]),
		(value) => (value instanceof Date ? value.toISOString() : value) as any
	)

describe('Nested Array with Optional Properties', () => {
	test('should preserve array items when cleaning nested arrays', () => {
		const WeightSchema = Type.Object({
			amount: Type.Number(),
			unit: Type.Union([
				Type.Literal('g'),
				Type.Literal('oz'),
				Type.Literal('lb'),
				Type.Literal('kg')
			])
		})

		const PourSchema = Type.Object({
			weight: WeightSchema,
			time: Type.Number()
		})

		const ResponseSchema = Type.Object({
			data: Type.Array(
				Type.Object({
					id: Type.String(),
					pours: Type.Union([Type.Null(), Type.Array(PourSchema)]),
					tags: Type.Array(Type.Object({ name: Type.String() })),
					createdAt: TDate()
				})
			)
		})

		const clean = createMirror(ResponseSchema, { Compile })

		const input = {
			data: [
				{
					id: 'test-1',
					pours: null,
					tags: [{ name: 'test' }],
					createdAt: new Date('2025-01-01'),
					extraProp: 'should-be-removed'
				}
			]
		}

		const result = clean(input)

		// Array items should be preserved
		expect(result.data).toHaveLength(1)
		expect(result.data[0].id).toBe('test-1')
		expect(result.data[0].pours).toBe(null)
		expect(result.data[0].tags).toHaveLength(1)
		expect(result.data[0].tags[0].name).toBe('test')

		// Extra property should be removed
		expect(result.data[0]).not.toHaveProperty('extraProp')
	})

	test('should handle multiple nested arrays correctly', () => {
		const Schema = Type.Object({
			outer: Type.Array(
				Type.Object({
					middle: Type.Array(
						Type.Object({
							inner: Type.Array(Type.String()),
							value: Type.String()
						})
					)
				})
			)
		})

		const clean = createMirror(Schema, { Compile })

		const input = {
			outer: [
				{
					middle: [
						{
							inner: ['a', 'b'],
							value: 'test',
							extra: 'remove'
						}
					],
					extraOuter: 'remove'
				}
			]
		}

		const result = clean(input)

		expect(result.outer).toHaveLength(1)
		expect(result.outer[0].middle).toHaveLength(1)
		expect(result.outer[0].middle[0].inner).toHaveLength(2)
		expect(result.outer[0].middle[0].value).toBe('test')
		expect(result.outer[0].middle[0]).not.toHaveProperty('extra')
		expect(result.outer[0]).not.toHaveProperty('extraOuter')
	})
})
