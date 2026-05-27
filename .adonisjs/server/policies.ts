export const policies = {
  ActionPolicy: () => import('#app/modules/actions/application/policies/action.policy'),
  MissionPolicy: () => import('#app/modules/missions/application/policies/mission.policy'),
  RobotDogPolicy: () => import('#app/modules/dogs/application/policies/robot-dog.policy'),
  UserPolicy: () => import('#app/modules/users/application/policies/user.policy'),
}
