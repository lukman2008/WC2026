import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server'

export const config = {
  runtime: 'nodejs',
}

export default createStartHandler(defaultStreamHandler)

