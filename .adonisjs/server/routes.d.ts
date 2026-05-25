import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'index_user': { paramsTuple?: []; params?: {} }
    'me_user': { paramsTuple?: []; params?: {} }
    'list_robot_dog_owners': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'assign_user_dog': { paramsTuple?: []; params?: {} }
    'show_user': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'update_user': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'list_user_dogs': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'adopt_user_dog': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'abandon_user_dog': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'register_auth': { paramsTuple?: []; params?: {} }
    'login_auth': { paramsTuple?: []; params?: {} }
    'login_with_totp_auth': { paramsTuple?: []; params?: {} }
    'password_reset_auth': { paramsTuple?: []; params?: {} }
    'google_login_auth': { paramsTuple?: []; params?: {} }
    'send_email_verification_auth': { paramsTuple?: []; params?: {} }
    'start_totp_setup_auth': { paramsTuple?: []; params?: {} }
    'finalize_totp_setup_auth': { paramsTuple?: []; params?: {} }
    'list_mfa_enrollments_auth': { paramsTuple?: []; params?: {} }
    'disable_mfa_auth': { paramsTuple?: []; params?: {} }
    'delete_account_auth': { paramsTuple?: []; params?: {} }
    'index_robot_dog': { paramsTuple?: []; params?: {} }
    'list_user_robot_dogs': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'show_robot_dog': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'create_robot_dog': { paramsTuple?: []; params?: {} }
    'destroy_robot_dog': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'update_robot_dog': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'create_mission': { paramsTuple?: []; params?: {} }
    'index_mission': { paramsTuple?: []; params?: {} }
    'show_mission': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'update_mission': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'destroy_mission': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'add_step': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'destroy_mission_step': { paramsTuple: [ParamValue,ParamValue]; params: {'missionId': ParamValue,'stepId': ParamValue} }
    'move_mission_step': { paramsTuple: [ParamValue,ParamValue]; params: {'missionId': ParamValue,'stepId': ParamValue} }
    'list_missions_by_dog_use_case': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'assign_to_dog': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'remove_from_dog': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'missionId': ParamValue} }
    'create_action': { paramsTuple?: []; params?: {} }
    'index': { paramsTuple?: []; params?: {} }
    'show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  GET: {
    'index_user': { paramsTuple?: []; params?: {} }
    'me_user': { paramsTuple?: []; params?: {} }
    'list_robot_dog_owners': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'show_user': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'list_user_dogs': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'index_robot_dog': { paramsTuple?: []; params?: {} }
    'list_user_robot_dogs': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'show_robot_dog': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'index_mission': { paramsTuple?: []; params?: {} }
    'show_mission': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'list_missions_by_dog_use_case': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'index': { paramsTuple?: []; params?: {} }
    'show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  HEAD: {
    'index_user': { paramsTuple?: []; params?: {} }
    'me_user': { paramsTuple?: []; params?: {} }
    'list_robot_dog_owners': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'show_user': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'list_user_dogs': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'index_robot_dog': { paramsTuple?: []; params?: {} }
    'list_user_robot_dogs': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'show_robot_dog': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'index_mission': { paramsTuple?: []; params?: {} }
    'show_mission': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'list_missions_by_dog_use_case': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'index': { paramsTuple?: []; params?: {} }
    'show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  POST: {
    'assign_user_dog': { paramsTuple?: []; params?: {} }
    'adopt_user_dog': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'abandon_user_dog': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'register_auth': { paramsTuple?: []; params?: {} }
    'login_auth': { paramsTuple?: []; params?: {} }
    'login_with_totp_auth': { paramsTuple?: []; params?: {} }
    'password_reset_auth': { paramsTuple?: []; params?: {} }
    'google_login_auth': { paramsTuple?: []; params?: {} }
    'send_email_verification_auth': { paramsTuple?: []; params?: {} }
    'start_totp_setup_auth': { paramsTuple?: []; params?: {} }
    'finalize_totp_setup_auth': { paramsTuple?: []; params?: {} }
    'list_mfa_enrollments_auth': { paramsTuple?: []; params?: {} }
    'create_robot_dog': { paramsTuple?: []; params?: {} }
    'create_mission': { paramsTuple?: []; params?: {} }
    'add_step': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'assign_to_dog': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'create_action': { paramsTuple?: []; params?: {} }
  }
  PATCH: {
    'update_user': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  DELETE: {
    'disable_mfa_auth': { paramsTuple?: []; params?: {} }
    'delete_account_auth': { paramsTuple?: []; params?: {} }
    'destroy_robot_dog': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'destroy_mission': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'destroy_mission_step': { paramsTuple: [ParamValue,ParamValue]; params: {'missionId': ParamValue,'stepId': ParamValue} }
    'remove_from_dog': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'missionId': ParamValue} }
    'destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  PUT: {
    'update_robot_dog': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'update_mission': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'move_mission_step': { paramsTuple: [ParamValue,ParamValue]; params: {'missionId': ParamValue,'stepId': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}