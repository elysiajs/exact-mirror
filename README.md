# Exact Mirror

Enforce value to TypeBox/OpenAPI model

By providing model ahead of time, the library will generate a function to mirror a value to an exact type

```
$ bun benchmarks/small

clk: ~3.13 GHz
cpu: Apple M1 Max
runtime: bun 1.2.4 (arm64-darwin)

summary
  Exact Mirror
   556.23x faster than TypeBox Value.Clean
```

## Installation

```bash
# Using either one of the package manager
npm install exact-mirror
yarn add exact-mirror
pnpm add exact-mirror
bun add exact-mirror
```

## Usage

It is designed to be used with [TypeBox](https://github.com/sinclairzx81/typebox) but an OpenAPI schema should also work.

```typescript
import { Type as t } from '@sinclair/typebox'
import { createMirror } from 'exact-mirror'

const shape = t.Object({
	name: t.String(),
	id: t.Number()
})

const value = {
	id: 0,
	name: 'saltyaom',
	// @ts-expect-error
	shoudBeRemoved: true
} satisfies typeof shape.static

const mirror = createMirror(shape)

console.log(mirror(value)) // {"id":0,"name":"saltyaom"}
```

## Decode / Encode

By default `createMirror` only **cleans** a value to the model's shape. Opt into `decode` or `encode` to also apply a TypeBox codec's transform at codec leaves during the same walk — a fast replacement for `Value.Decode` / `Value.Encode` (~350x faster on a nested + array schema).

```typescript
import { Type as t } from 'typebox'
import { Compile } from 'typebox/compile'
import { createMirror } from 'exact-mirror'

const Numeric = t.Union([
	t.Number(),
	t
		.Codec(t.String())
		.Decode((v) => +v)
		.Encode((v) => '' + v)
])

const shape = t.Object({ id: Numeric })

const decode = createMirror(shape, { decode: true, Compile })

decode({ id: '2' }) // { id: 2 } — parsed + cleaned in one pass
decode({ id: 2 }) //  { id: 2 } — already-numeric branch, untouched
```

- `decode: true` applies each codec's `~codec.decode` (parse input).
- `encode: true` applies each codec's `~codec.encode` (the reverse).
- Both default **off** — output is byte-identical to the pure clean.

> Decode/encode is a pure transform: the value is assumed to have already passed `Check`. Validate the input first, then mirror.
