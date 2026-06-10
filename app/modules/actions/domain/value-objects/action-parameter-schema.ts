export type ActionParamType = 'number' | 'string' | 'boolean'

export interface ActionParameterField {
  name: string
  label: string
  type: ActionParamType
  required: boolean
  unit?: string
  min?: number
  max?: number
  defaultValue?: number | string | boolean
}

export interface ActionParameterSchema {
  fields: ActionParameterField[]
}
