import { t } from 'elysia'
import createMirror from '../src/index'

import { TypeCompiler } from '@sinclair/typebox/compiler'

const SharedSchemaA = t.Object({ qux: t.Literal('a') })
const SharedSchemaB = t.Object({ qux: t.Literal('b') })
const SchemaA = t.Object({ foo: t.Number() })
const SchemaB = t.Object({ foo: t.Number(), baz: t.Boolean() })

const IntersectSchemaA = t.Intersect([SchemaA, SharedSchemaA])
const IntersectSchemaB = t.Intersect([SchemaB, SharedSchemaB])

const UnionSchema = t.Union([IntersectSchemaA, IntersectSchemaB])
const OmittedUnionSchema = t.Omit(UnionSchema, ['baz'])

const shape = t.Array(OmittedUnionSchema)

const value = [
	{ bar: 'asd', baz: true, qux: 'b', foo: 1 }
] satisfies typeof shape.static

const mirror = createMirror(shape, {
	TypeCompiler
})

console.log(mirror.toString())

console.dir(mirror(value), {
	depth: null
})
