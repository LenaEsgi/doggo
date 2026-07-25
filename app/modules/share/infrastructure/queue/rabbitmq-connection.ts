import amqplib, { type Channel, type ChannelModel } from 'amqplib'

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
      this.channelPromise = this.connect(config)
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
    return connection.createChannel()
  }
}
