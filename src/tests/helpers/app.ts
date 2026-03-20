import { FastifyInstance } from 'fastify'
import { buildApp } from '../../app'

let instance: FastifyInstance | null = null

export async function getApp(): Promise<FastifyInstance> {
  if (!instance) {
    instance = await buildApp()
    await instance.ready()
  }
  return instance
}
