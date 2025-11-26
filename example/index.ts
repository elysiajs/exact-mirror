import { t } from 'elysia'
import createMirror from '../src/index'

import { TypeCompiler } from '@sinclair/typebox/compiler'

const SchemaA = t.Object(
	{ foo: t.Number() },
	{
		additionalProperties: false
	}
)
const SchemaB = t.Object(
	{ foo: t.Number(), baz: t.Boolean() },
	{
		additionalProperties: false
	}
)
const UnionSchema = t.Union([SchemaA, SchemaB])
const OmittedUnionSchema = t.Omit(UnionSchema, ['baz'])

const shape = OmittedUnionSchema

const value = { baz: true, foo: 1 } satisfies typeof shape.static

const mirror = createMirror(shape, {
	TypeCompiler
})

console.log(mirror.toString())

console.dir(mirror(value), {
	depth: null
})
