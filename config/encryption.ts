import env from '#start/env'
import { defineConfig, drivers } from '@adonisjs/core/encryption'

export default defineConfig({
  /**
   * The default driver used by encryption.encrypt() and
   * encryption.decrypt() when no driver is explicitly specified.
   */
  default: 'chacha',

  list: {
    chacha: drivers.chacha20({
      id: 'chacha',
      keys: [env.get('APP_KEY')],
    }),

    /**
     * AES-256-GCM: Industry-standard authenticated encryption.
     */
    // gcm: drivers.aes256gcm({
    //   id: 'gcm',
    //   keys: [env.get('APP_KEY')],
    // }),

    /**
     * AES-256-CBC: Legacy support with HMAC authentication.
     */
    // cbc: drivers.aes256cbc({
    //   id: 'cbc',
    //   keys: [env.get('APP_KEY')],
    // }),

    /**
     * Legacy: Decrypt data encrypted with AdonisJS v6.
     * Use this driver to migrate encrypted data from v6 to v7.
     */
    // legacy: drivers.legacy({
    //   keys: [env.get('APP_KEY')],
    // }),
  },
})
