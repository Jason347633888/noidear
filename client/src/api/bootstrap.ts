import request from './request';

export function getOrgBootstrapStatus() {
  return request.get('/org-bootstrap/status');
}
