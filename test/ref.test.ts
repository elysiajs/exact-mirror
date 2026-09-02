import createMirror from '../src'

import { Static, Type as t } from 'typebox'
import { Compile } from 'typebox/compile'

import { describe, it, expect } from 'bun:test'
import { isEqual } from './utils'

const Nullable = <T extends t.TSchema>(schema: T) => t.Union([schema, t.Null()])

describe('Ref', () => {
	it('handle module', () => {
		const modules = t.Module({
			object: t.Object({
				name: t.String(),
				optional: t.Optional(t.String())
			})
		})

		const shape = modules.object

		const value = {
			name: 'salt'
		} satisfies Static<typeof shape>

		isEqual(shape, value)
	})

	it('handle nested ref', () => {
		const modules = t.Module({
			object: t.Object({
				name: t.String(),
				info: t.Ref('info')
			}),
			info: t.Object({
				id: t.Number(),
				name: t.String()
			})
		})

		const shape = modules.object

		const value = {
			name: 'salt',
			info: {
				id: 123,
				name: 'salt'
			}
		} satisfies Static<typeof shape>

		isEqual(shape, value)
	})

	it('handle optional ref', () => {
		const modules = t.Module({
			object: t.Object({
				name: t.String(),
				info: t.Optional(t.Ref('info'))
			}),
			info: t.Object({
				id: t.Number(),
				name: t.String()
			})
		})

		const shape = modules.object

		const value = {
			name: 'salt'
		} satisfies Static<typeof shape>

		isEqual(shape, {
			name: 'salt'
		})

		isEqual(shape, {
			name: 'salt',
			info: {
				id: 123,
				name: 'salt'
			}
		})
	})

	it('handle custom modules', () => {
		const definitions = {
			object: t.Object({
				name: t.String(),
				optional: t.Optional(t.String())
			})
		}

		const shape = definitions.object

		const value = {
			name: 'salt'
		} satisfies Static<typeof shape>

		expect(
			createMirror(shape, {
				definitions
			})(value)
		).toEqual(value)
	})

	it('handle recursion', () => {
		const shape = t.Module({
			a: t.Object({ type: t.String(), a: Nullable(t.Ref('a')) })
		})

		const mirror = createMirror(shape.a, {
			Compile,
			modules: shape
		})

		expect(
			mirror({
				type: 'a',
				extra: 'x',
				a: {
					type: 'a',
					extra: 'x',
					a: {
						type: 'a',
						extra: 'x',
						a: null
					}
				}
			} as any)
		).toEqual({
			type: 'a',
			a: {
				type: 'a',
				a: {
					type: 'a',
					a: null
				}
			}
		})
	})

	it('handle recursion in array', () => {
		const shape = t.Module({
			a: t.Object({ type: t.String(), a: t.Array(t.Ref('a')) })
		})

		const mirror = createMirror(shape.a, {
			Compile,
			modules: shape
		})

		expect(
			mirror({
				type: 'a',
				extra: 'x',
				a: [
					{ type: 'a', extra: 'x', a: [{ type: 'a', a: [] }] },
					{ type: 'a', a: [{ type: 'a', extra: 'x', a: [] }] }
				]
			} as any)
		).toEqual({
			type: 'a',
			a: [
				{ type: 'a', a: [{ type: 'a', a: [] }] },
				{ type: 'a', a: [{ type: 'a', a: [] }] }
			]
		})
	})

	it('handle recursion in union without modules option', () => {
		const shape = t.Module({
			a: t.Object({
				type: t.String(),
				data: t.Union([Nullable(t.Ref('a')), t.Array(t.Ref('a'))])
			})
		})

		const mirror = createMirror(shape.a, { Compile })

		expect(
			mirror({
				type: 'yea',
				extra: 'x',
				data: {
					type: 'ok',
					extra: 'x',
					data: [
						{
							type: 'cool',
							extra: 'x',
							data: null
						}
					]
				}
			} as any)
		).toEqual({
			type: 'yea',
			data: {
				type: 'ok',
				data: [
					{
						type: 'cool',
						data: null
					}
				]
			}
		})
	})

	it('handle recursion nested in an object inside union branch', () => {
		const definitions = {
			a: t.Object({
				type: t.String(),
				data: t.Union([t.Object({ another: t.Ref('a') }), t.Null()])
			})
		}

		const mirror = createMirror(definitions.a, {
			Compile,
			definitions
		})

		// the branch is only selected if its nested `$ref` is dereferenced,
		// otherwise the value falls through unmirrored
		expect(
			mirror({
				type: 'yea',
				extra: 'x',
				data: {
					extra: 'x',
					another: {
						type: 'ok',
						extra: 'x',
						data: null
					}
				}
			} as any)
		).toEqual({
			type: 'yea',
			data: {
				another: {
					type: 'ok',
					data: null
				}
			}
		})
	})

	it('handle recursion nested 3 levels deep inside union branch', () => {
		const definitions = {
			a: t.Object({
				type: t.String(),
				data: t.Union([
					t.Object({ l1: t.Object({ l2: t.Ref('a') }) }),
					t.Null()
				])
			})
		}

		const mirror = createMirror(definitions.a, {
			Compile,
			definitions
		})

		expect(
			mirror({
				type: 'yea',
				extra: 'x',
				data: {
					extra: 'x',
					l1: {
						extra: 'x',
						l2: {
							type: 'ok',
							extra: 'x',
							data: null
						}
					}
				}
			} as any)
		).toEqual({
			type: 'yea',
			data: {
				l1: {
					l2: {
						type: 'ok',
						data: null
					}
				}
			}
		})
	})

	it('handle optional recursion inside union branch', () => {
		const definitions = {
			a: t.Object({
				type: t.String(),
				data: t.Union([
					t.Object({ opt: t.Optional(t.Ref('a')) }),
					t.Null()
				])
			})
		}

		const mirror = createMirror(definitions.a, {
			Compile,
			definitions
		})

		expect(
			mirror({
				type: 'yea',
				extra: 'x',
				data: {
					extra: 'x',
					opt: {
						type: 'ok',
						extra: 'x',
						data: null
					}
				}
			} as any)
		).toEqual({
			type: 'yea',
			data: {
				opt: {
					type: 'ok',
					data: null
				}
			}
		})

		expect(
			mirror({
				type: 'yea',
				data: {
					extra: 'x'
				}
			} as any)
		).toEqual({
			type: 'yea',
			data: {}
		})
	})

	it('handle recursion in an array of object inside union branch', () => {
		const definitions = {
			a: t.Object({
				type: t.String(),
				data: t.Union([
					t.Array(t.Object({ child: t.Ref('a') })),
					t.Null()
				])
			})
		}

		const mirror = createMirror(definitions.a, {
			Compile,
			definitions
		})

		expect(
			mirror({
				type: 'yea',
				extra: 'x',
				data: [
					{
						extra: 'x',
						child: {
							type: 'ok',
							extra: 'x',
							data: null
						}
					}
				]
			} as any)
		).toEqual({
			type: 'yea',
			data: [
				{
					child: {
						type: 'ok',
						data: null
					}
				}
			]
		})
	})
})
