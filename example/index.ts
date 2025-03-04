import { t } from 'elysia'
import { createMirror } from '../src/index'
import { TypeCompiler } from '@sinclair/typebox/compiler'

const shape = t.Array(t.Number())

const value = [1,2] satisfies typeof shape.static

const mirror = createMirror(shape, {
	// TypeCompiler
})

console.dir(mirror(value), {
	depth: null
})
