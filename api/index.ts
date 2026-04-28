import { createStartHandler } from '@tanstack/react-start/server'
import { getRouter } from '@/router'

export const config = {
  runtime: 'nodejs',
}

export default createStartHandler(getRouter)

