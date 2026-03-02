import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'index_user': { paramsTuple?: []; params?: {} }
    'show_user': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'update_user': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'delete_user': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'register_auth': { paramsTuple?: []; params?: {} }
    'login_auth': { paramsTuple?: []; params?: {} }
    'login_with_totp_auth': { paramsTuple?: []; params?: {} }
    'password_reset_auth': { paramsTuple?: []; params?: {} }
    'start_totp_setup_auth': { paramsTuple?: []; params?: {} }
    'finalize_totp_setup_auth': { paramsTuple?: []; params?: {} }
    'list_mfa_enrollments_auth': { paramsTuple?: []; params?: {} }
    'disable_mfa_auth': { paramsTuple?: []; params?: {} }
    'delete_account_auth': { paramsTuple?: []; params?: {} }
    'index_robot_dog': { paramsTuple?: []; params?: {} }
    'show_robot_dog': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'create_robot_dog': { paramsTuple?: []; params?: {} }
    'destroy_robot_dog': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'update_robot_dog': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  GET: {
    'index_user': { paramsTuple?: []; params?: {} }
    'show_user': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'index_robot_dog': { paramsTuple?: []; params?: {} }
    'show_robot_dog': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  HEAD: {
    'index_user': { paramsTuple?: []; params?: {} }
    'show_user': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'index_robot_dog': { paramsTuple?: []; params?: {} }
    'show_robot_dog': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  PATCH: {
    'update_user': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  DELETE: {
    'delete_user': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'disable_mfa_auth': { paramsTuple?: []; params?: {} }
    'delete_account_auth': { paramsTuple?: []; params?: {} }
    'destroy_robot_dog': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  POST: {
    'register_auth': { paramsTuple?: []; params?: {} }
    'login_auth': { paramsTuple?: []; params?: {} }
    'login_with_totp_auth': { paramsTuple?: []; params?: {} }
    'password_reset_auth': { paramsTuple?: []; params?: {} }
    'start_totp_setup_auth': { paramsTuple?: []; params?: {} }
    'finalize_totp_setup_auth': { paramsTuple?: []; params?: {} }
    'list_mfa_enrollments_auth': { paramsTuple?: []; params?: {} }
    'create_robot_dog': { paramsTuple?: []; params?: {} }
  }
  PUT: {
    'update_robot_dog': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}