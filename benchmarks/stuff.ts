import { t } from 'elysia'
import { benchmark } from './utils'

benchmark(
	t.Object({
		type: t.Literal('email'),
		name: t.String(),
		details: t.Object(
			{
				from: t.String({
					default: 'mydefault',
					maxLength: 512
				}),
				subject: t.String({
					maxLength: 512
				})
			},
			{ default: {} }
		)
	}),
	{}
)
