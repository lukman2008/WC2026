import { createStartHandler } from '@tanstack/react-start/server'
import { getRouter } from '@/router'

export const config = {
  runtime: 'edge',
}

const handler = createStartHandler({
  createRouter: getRouter,
})

export default handler
