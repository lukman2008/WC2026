import { createStartClient } from '@tanstack/react-start/client'
import { getRouter } from './router'

const router = getRouter()

const client = createStartClient({
  router,
})

client.hydrate()
