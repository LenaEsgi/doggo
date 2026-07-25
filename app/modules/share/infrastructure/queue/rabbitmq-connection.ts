import amqplib, { type Channel, type ChannelModel } from 'amqplib'
import logger from '@adonisjs/core/services/logger'

export type RabbitMqConfig = {
  hostname: string
  port: number
  username: string
  password?: string
  vhost?: string
}

export class RabbitMqConnection {
  private static channelPromise: Promise<Channel> | null = null

  static async getChannel(config: RabbitMqConfig): Promise<Channel> {
    if (!this.channelPromise) {
      // Cache the promise (not just its resolved value) so concurrent callers
      // during connection setup share the same in-flight attempt. If it rejects,
      // clear the cache so the *next* call gets a fresh connection attempt
      // instead of instantly re-rejecting on the same dead promise forever -
      // the current caller still observes this attempt's failure below.
      this.channelPromise = this.connect(config).catch((error) => {
        this.channelPromise = null
        throw error
      })
    }
    return this.channelPromise
  }

  private static async connect(config: RabbitMqConfig): Promise<Channel> {
    const connection: ChannelModel = await amqplib.connect({
      protocol: 'amqp',
      hostname: config.hostname,
      port: config.port,
      username: config.username,
      password: config.password,
      vhost: config.vhost || '/',
    })

    // If the connection dies after a successful boot (broker restart, network
    // blip, etc.), it would otherwise sit silently broken forever since nothing
    // else observes it. Clearing the cache here means the next getChannel() call
    // transparently reconnects instead of reusing a dead channel/connection.
    connection.on('error', (error) => {
      logger.error({ err: error }, 'RabbitMqConnection: erreur sur la connexion AMQP')
      this.channelPromise = null
    })
    connection.on('close', () => {
      logger.warn('RabbitMqConnection: connexion AMQP fermée')
      this.channelPromise = null
    })

    return connection.createChannel()
  }
}
