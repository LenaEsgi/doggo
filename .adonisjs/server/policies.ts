export const policies = {
  UserPolicy: () => import('#app/modules/users/application/policies/user.policy'),
  MissionPolicy: () => import('#app/modules/missions/application/policies/mission.policy'),
  ActionPolicy: () => import('#app/modules/actions/application/policies/action.policy'),
  RobotDogPolicy: () => import('#app/modules/dogs/application/policies/robot-dog.policy'),
}

