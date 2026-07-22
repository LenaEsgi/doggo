import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
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
    'index_user': { paramsTuple?: []; params?: {} }
    'me_user': { paramsTuple?: []; params?: {} }
    'list_robot_dog_owners': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'assign_user_dog': { paramsTuple?: []; params?: {} }
    'revoke_user_dog': { paramsTuple?: []; params?: {} }
    'show_user': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'update_user': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'list_user_dogs': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'adopt_user_dog': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'abandon_user_dog': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'index_robot_dog': { paramsTuple?: []; params?: {} }
    'list_user_robot_dogs': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'show_robot_dog': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'create_robot_dog': { paramsTuple?: []; params?: {} }
    'destroy_robot_dog': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'update_robot_dog': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'find_robot_dog_by_serial_number': { paramsTuple: [ParamValue]; params: {'serialNumber': ParamValue} }
    'create_mission': { paramsTuple?: []; params?: {} }
    'index_all_missions': { paramsTuple?: []; params?: {} }
    'index_my_missions': { paramsTuple?: []; params?: {} }
    'show_mission': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'update_mission': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'destroy_mission': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'add_step': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'sync_mission_steps': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'destroy_mission_step': { paramsTuple: [ParamValue,ParamValue]; params: {'missionId': ParamValue,'stepId': ParamValue} }
    'move_mission_step': { paramsTuple: [ParamValue,ParamValue]; params: {'missionId': ParamValue,'stepId': ParamValue} }
    'create_mission_schedule': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'list_mission_schedules': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'update_mission_schedule': { paramsTuple: [ParamValue,ParamValue]; params: {'missionId': ParamValue,'scheduleId': ParamValue} }
    'toggle_mission_schedule': { paramsTuple: [ParamValue,ParamValue]; params: {'missionId': ParamValue,'scheduleId': ParamValue} }
    'destroy_mission_schedule': { paramsTuple: [ParamValue,ParamValue]; params: {'missionId': ParamValue,'scheduleId': ParamValue} }
    'list_missions_by_dog_use_case': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'assign_to_dog': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'remove_from_dog': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'missionId': ParamValue} }
    'create_action': { paramsTuple?: []; params?: {} }
    'index': { paramsTuple?: []; params?: {} }
    'show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'list_notifications': { paramsTuple?: []; params?: {} }
    'mark_notifications_read': { paramsTuple?: []; params?: {} }
    'get_active_mission': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'start_mission': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'stop_mission': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'start_session': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'end_session': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'get_backoffice_stats': { paramsTuple?: []; params?: {} }
    'event_stream': { paramsTuple?: []; params?: {} }
    'subscribe': { paramsTuple?: []; params?: {} }
    'unsubscribe': { paramsTuple?: []; params?: {} }
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
    'find_robot_dog_by_serial_number': { paramsTuple: [ParamValue]; params: {'serialNumber': ParamValue} }
    'index_all_missions': { paramsTuple?: []; params?: {} }
    'index_my_missions': { paramsTuple?: []; params?: {} }
    'show_mission': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'list_mission_schedules': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'list_missions_by_dog_use_case': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'index': { paramsTuple?: []; params?: {} }
    'show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'list_notifications': { paramsTuple?: []; params?: {} }
    'get_active_mission': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'get_backoffice_stats': { paramsTuple?: []; params?: {} }
    'event_stream': { paramsTuple?: []; params?: {} }
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
    'find_robot_dog_by_serial_number': { paramsTuple: [ParamValue]; params: {'serialNumber': ParamValue} }
    'index_all_missions': { paramsTuple?: []; params?: {} }
    'index_my_missions': { paramsTuple?: []; params?: {} }
    'show_mission': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'list_mission_schedules': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'list_missions_by_dog_use_case': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'index': { paramsTuple?: []; params?: {} }
    'show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'list_notifications': { paramsTuple?: []; params?: {} }
    'get_active_mission': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'get_backoffice_stats': { paramsTuple?: []; params?: {} }
    'event_stream': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'register_auth': { paramsTuple?: []; params?: {} }
    'login_auth': { paramsTuple?: []; params?: {} }
    'login_with_totp_auth': { paramsTuple?: []; params?: {} }
    'password_reset_auth': { paramsTuple?: []; params?: {} }
    'google_login_auth': { paramsTuple?: []; params?: {} }
    'send_email_verification_auth': { paramsTuple?: []; params?: {} }
    'start_totp_setup_auth': { paramsTuple?: []; params?: {} }
    'finalize_totp_setup_auth': { paramsTuple?: []; params?: {} }
    'list_mfa_enrollments_auth': { paramsTuple?: []; params?: {} }
    'assign_user_dog': { paramsTuple?: []; params?: {} }
    'revoke_user_dog': { paramsTuple?: []; params?: {} }
    'adopt_user_dog': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'abandon_user_dog': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'create_robot_dog': { paramsTuple?: []; params?: {} }
    'create_mission': { paramsTuple?: []; params?: {} }
    'add_step': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'create_mission_schedule': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'assign_to_dog': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'create_action': { paramsTuple?: []; params?: {} }
    'start_mission': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'start_session': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'subscribe': { paramsTuple?: []; params?: {} }
    'unsubscribe': { paramsTuple?: []; params?: {} }
  }
  DELETE: {
    'disable_mfa_auth': { paramsTuple?: []; params?: {} }
    'delete_account_auth': { paramsTuple?: []; params?: {} }
    'destroy_robot_dog': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'destroy_mission': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'destroy_mission_step': { paramsTuple: [ParamValue,ParamValue]; params: {'missionId': ParamValue,'stepId': ParamValue} }
    'destroy_mission_schedule': { paramsTuple: [ParamValue,ParamValue]; params: {'missionId': ParamValue,'scheduleId': ParamValue} }
    'remove_from_dog': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'missionId': ParamValue} }
    'destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'stop_mission': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'end_session': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  PATCH: {
    'update_user': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'toggle_mission_schedule': { paramsTuple: [ParamValue,ParamValue]; params: {'missionId': ParamValue,'scheduleId': ParamValue} }
    'update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'mark_notifications_read': { paramsTuple?: []; params?: {} }
  }
  PUT: {
    'update_robot_dog': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'update_mission': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'sync_mission_steps': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'move_mission_step': { paramsTuple: [ParamValue,ParamValue]; params: {'missionId': ParamValue,'stepId': ParamValue} }
    'update_mission_schedule': { paramsTuple: [ParamValue,ParamValue]; params: {'missionId': ParamValue,'scheduleId': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}