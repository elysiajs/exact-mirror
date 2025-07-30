import { t } from 'elysia'
import { createMirror } from '../src/index'
import { TypeCompiler } from '@sinclair/typebox/compiler'

const shape = t.Object({
	'64x64': t.String()
})

const value = {
	'64x64': 'a'
} satisfies typeof shape.static

const mirror = createMirror(shape, {
	TypeCompiler
})

console.dir(mirror(value), {
	depth: null
})
