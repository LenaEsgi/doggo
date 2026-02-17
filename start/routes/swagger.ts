import router from '@adonisjs/core/services/router'
import AutoSwagger from 'adonis-autoswagger'
import swaggerConfig from '#config/swagger'
import fs from 'node:fs'
import app from '@adonisjs/core/services/app'
import yaml from 'js-yaml'

router.get('/swagger.json', async () => {
  const yamlPath = app.makePath('swagger.yml')
  const fileContent = fs.readFileSync(yamlPath, 'utf8')

  return yaml.load(fileContent)
})

router.get('/docs', async () => {
  return AutoSwagger.default.ui('/swagger.json', swaggerConfig)
})
