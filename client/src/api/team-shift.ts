import request from './request';

export const teamShiftApi = {
  listTeams() {
    return request.get('/team-shifts/teams');
  },
  listShiftTypes() {
    return request.get('/team-shifts/shift-types');
  },
};
