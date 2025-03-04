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
