import { t } from 'elysia'
import { benchmark } from './utils'

benchmark(
	t.Object({
		id: t.Number(),
		name: t.String(),
		bio: t.String(),
		metadata: t.Object({
			alias: t.String(),
			country: t.String()
		})
	}),
	{
		id: 1,
		name: 'SaltyAom',
		bio: 'I like train',
		metadata: {
			alias: 'SaltyAom',
			country: 'Thailand'
		}
	}
)
