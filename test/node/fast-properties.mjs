// Run with: node --allow-natives-syntax test/node/fast-properties.mjs [path to built index.mjs]
//
// V8 drops an object to dictionary mode when a key is deleted, even the last
// one, and a dictionary object is several times larger and slower to read.
// A mirror output with absent optional keys must stay in fast mode.
import { pathToFileURL } from 'node:url'

import { Type as t } from 'typebox'
import { Compile } from 'typebox/compile'

const hasFastProperties = (() => {
	try {
		return new Function('o', 'return %HasFastProperties(o)')
	} catch {
		console.error('❌ run with node --allow-natives-syntax')
		process.exit(1)
	}
})()

const { createMirror } = await import(
	process.argv[2]
		? pathToFileURL(process.argv[2]).href
		: new URL('../../dist/index.mjs', import.meta.url).href
)

// every plain object reachable from the output, arrays excluded
const objects = (value, path = '$', out = []) => {
	if (value && typeof value === 'object') {
		if (!Array.isArray(value)) out.push([path, value])
		for (const key of Object.keys(value))
			objects(value[key], `${path}.${key}`, out)
	}

	return out
}

const Meta = t.Object({ x: t.Optional(t.Number()), y: t.String() })
const User = t.Object({
	name: t.String(),
	bio: t.Optional(t.String()),
	age: t.Number(),
	meta: t.Optional(Meta),
	email: t.Optional(t.String())
})
const Item = t.Object({ id: t.Number(), tag: t.Optional(t.String()) })

const cases = [
	[
		'flat',
		t.Object({
			id: t.Number(),
			name: t.String(),
			bio: t.Optional(t.String()),
			age: t.Optional(t.Number())
		}),
		{ id: 1, name: 'a' }
	],
	['nested object', User, { name: 'a', age: 1, meta: { y: 'y' } }],
	['nested object absent', User, { name: 'a', age: 1 }],
	[
		'array items',
		t.Object({ list: t.Array(Item) }),
		{ list: [{ id: 1 }, { id: 2, tag: 't' }] }
	],
	['root array', t.Array(Item), [{ id: 1 }, { id: 2, tag: 't' }, { id: 3 }]],
	[
		'union member',
		t.Object({
			u: t.Union([
				t.Object({ kind: t.Literal('a'), x: t.Optional(t.String()) }),
				t.Object({ kind: t.Literal('b'), y: t.Optional(t.Number()) })
			])
		}),
		{ u: { kind: 'b' } }
	],
	[
		'intersect',
		t.Intersect([
			t.Object({ a: t.Optional(t.String()), b: t.String() }),
			t.Object({ c: t.Optional(t.Number()) })
		]),
		{ b: 'b' }
	]
]

let failed = 0

for (const [name, schema, input] of cases) {
	const output = createMirror(schema, { Compile })(input)

	for (const [path, object] of objects(output))
		if (!hasFastProperties(object)) {
			failed++
			console.error(`❌ ${name}: ${path} is in dictionary mode`)
		}
}

if (failed) process.exit(1)

console.log(`✅ ${cases.length} mirror outputs keep fast properties`)
