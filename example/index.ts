import { t } from 'elysia'
import { createMirror } from '../src/index'
import { TypeCompiler } from '@sinclair/typebox/compiler'

const shape = t.Module({
	a: t.Object({ type: t.String(), a: t.Array(t.Ref('a')) })
})

const actual = shape.Import('a')

const value = {
	type: 'a',
	a: [
		{ type: 'a', a: [{ type: 'a', a: [] }] },
		{ type: 'a', a: [{ type: 'a', a: [] }] }
	]
} satisfies typeof actual.static

const mirror = createMirror(shape.Import('a'), {
	TypeCompiler
})

console.dir(mirror(value), {
	depth: null
})
