import 'dotenv/config'
import { buildApp } from './app'

const PORT = Number(process.env.PORT) || 3333
const HOST = '0.0.0.0'

async function start() {
  const app = await buildApp()

  try {
    await app.listen({ port: PORT, host: HOST })
    console.log(`\n🚀 Server running at http://localhost:${PORT}`)
    console.log(`📄 Docs available at http://localhost:${PORT}/docs\n`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
