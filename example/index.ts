import { t } from 'elysia'
import createMirror, { createMirrorCode } from '../src/index'

import { TypeCompiler } from '@sinclair/typebox/compiler'

const shape = t.Object({
	'character.name': t.String()
})

const value = {
	'character.name': 'SaltyAom'
} satisfies typeof shape.static

const mirror = createMirrorCode(shape, {
	TypeCompiler,
	sanitize: (a) => a
})

console.log(mirror)

// console.dir(mirror(value), {
// 	depth: null
// })
