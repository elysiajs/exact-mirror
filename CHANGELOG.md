# 1.2.6 - 7 Sep 2026

Bug fix:
- encode an union member (or array element)
- a decoded value that no sibling matches (e.g. a JSON array next to an object member) is returned as-is
- `sanitize` still applies inside a container-shaped codec
- scalar codecs (`Numeric`, `Date`) no longer re-enter their union on decode

# 1.2.5 - 7 Sep 2026

Bug fix:
- `decode` stop dropping optional fields of a container produced by a codec
- `sanitize` now not applied to a codec decoded value

# 1.2.4 - 7 Aug 2026

Bug fix:
- codec missing field is sometime lossy

# 1.2.3 - 6 Aug 2026

Security fix:
- a `__proto__` key in a **record** value no longer hijacks the cleaned output's prototype

# 1.2.2 - 15 Jun 2026

Bug fix:

- building a mirror over a union no longer throws on a **frozen** union member (e.g. Elysia's `Object.freeze`d coercion singletons)
- a plain `Ref` used as a union member is now resolved against `definitions` before the union's Compile gate, so the ref branch validates and `decode`s instead of falling through undecoded

# 1.2.1 - 15 Jun 2026

Bug fix:

- `decode` / `encode` now transform codec leaves inside a TypeBox `Type.Intersect` (`~kind: 'Intersect'`)
- Intersect is flattened into a merged object before the walk, so its codecs are reached (previously the whole node was passed through as identity)
- `deepClone` preserved only enumerable own properties, silently dropping TypeBox non-enumerable `~codec`, `~kind`, `~refine` and the prototype
- building a `decode` / `encode` mirror over a union no longer mutates the caller's schema

# 1.2.0 - 15 Jun 2026

Feature:

- add `decode` / `encode` codec transform mode. A drop in replacement for TypeBox Value.Decode

Bug fix:

- `deepClone` overflowed the stack on circular references through objects; the circular-reference guard now registers object clones before recursing (it already did so for arrays)

# 1.1.1 - 10 Jun 2026

Bug fix:

- escape special characters in property names: quotes, backslashes, newlines, backticks etc. previously produced a `SyntaxError` (or could inject into the generated code); detection is now identifier-based and names are escaped with `JSON.stringify`

# 1.1.0 - 10 Jun 2026

Feature:

- support cyclic schema (`~kind: 'Cyclic'`): each `$defs` definition compiles to its own mirror function and recursion happens between functions at runtime — unbounded depth, no `recursionLimit` truncation, no exponential ref inlining, `modules` option no longer required

Bug fix:

- cyclic schema previously produced a silent identity mirror (no stripping, no sanitize)
- handle array schema without `items` and object schema without `properties`, eg. elysia `t.ArrayString()` inside a union crashed codegen
- degrade unsupported schema node to identity for that node instead of failing the whole mirror

# 1.0.2 - 1 Jun 2026

Bug fix:

- export `source` in `emit` method

# 1.0.1 - 1 Jun 2026

Feature:

- add `emit` method

# 1.0.0 - 6 Apr 2026

Feature:

- Update to TypeBox 1

# 0.2.7 - 9 Feb 2026

Bug fix:

- [elysia#1700](https://github.com/elysiajs/elysia/issues/1700) distinct union object

# 0.2.6 - 3 Jan 2026

Bug fix:

- [elysia#1631](https://github.com/elysiajs/elysia/issues/1631), [#26](https://github.com/elysiajs/exact-mirror/pull/26) prevent sibling arrays from sharing optionalsInArray index

# 0.2.5 - 26 Nov 2025

Improvement:

- handle strict union check in array

# 0.2.4 - 26 Nov 2025

Improvement:

- handle strict union check

# 0.2.3 - 5 Nov 2025

Bug fix:

- [#24](https://github.com/elysiajs/exact-mirror/pull/24) bracket handling in fields

# 0.2.2 - 6 Sep 2025

Bug fix:

- revert `createMirrorCode`

# 0.2.1 - 5 Sep 2025

Bug fix:

- handle property name with dot

# 0.2.0 - 21 Aug 2025

Feature:

- add `createMirrorCode` to generate mirror code from schema

Improvement:

- inline unionCheck function to reduce closure reference

# 0.1.6 - 18 Aug 2025

Bug fix:

- handle optional property with special character

# 0.1.5 - 6 Aug 2025

Bug fix:

- [#23](https://github.com/elysiajs/exact-mirror/pull/23) optional properties not deleted

# 0.1.4 - 6 Aug 2025

Bug fix:

- handle nested additionalProperties

# 0.1.3 - 31 Jul 2025

Bug fix:

- handle property start with number

# 0.1.2 - 8 May Apr 2025

Feature:

- add `removeUnknownUnionType`

# 0.1.1 - 24 Apr 2025

Bug fix:

- handle reference of an union in an array

# 0.1.0 - 24 Apr 2025

Improvement:

- handle recursion from t.Ref and t.Recursive

# 0.0.9 - 24 Apr 2025

Bug fix:

- handle sanitize on top-level string

# 0.0.8 - 24 Apr 2025

Feature:

- Add sanitize options

# 0.0.7 - 22 Apr 2025

Improvement:

- Use ?. to access undefined property

# 0.0.6 - 27 Mar 2025

Improvement:

- Improve array performance by avoiding unnecessary closure reference

# 0.0.5 - 5 Mar 2025

Feature:

- support `t.Module`, `t.Ref`

# 0.0.4 - 4 Mar 2025

Bug fix:

- handle undefined union

# 0.0.3 - 4 Mar 2025

Bug fix:

- handle root array

# 0.0.2 - 4 Mar 2025

Feature:

- support Record, Tuple, Union

# 0.0.1 - 4 Mar 2025

Bug fix:

- incorrect array bracket limit
- handle deep nested optional object property
- using pointer instead of created value for

# 0.0.0 - 4 Mar 2025

Feature:

- initial release
