import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';

export const TEST_PREFIX = `e2e-task-${Date.now()}`;

export const IDS = {
  admin: `${TEST_PREFIX}-admin`,
  leader: `${TEST_PREFIX}-leader`,
  member: `${TEST_PREFIX}-member`,
  otherMember: `${TEST_PREFIX}-other-member`,
  dept: `${TEST_PREFIX}-dept`,
  otherDept: `${TEST_PREFIX}-dept-other`,
  tmpl: `${TEST_PREFIX}-tmpl`,
  tmplInactive: `${TEST_PREFIX}-tmpl-inactive`,
};

export const ALL_USER_IDS = [IDS.admin, IDS.leader, IDS.member, IDS.otherMember];
export const ALL_DEPT_IDS = [IDS.dept, IDS.otherDept];
export const ALL_TMPL_IDS = [IDS.tmpl, IDS.tmplInactive];
export const FUTURE_DL = new Date(Date.now() + 7 * 86400000).toISOString();
export const taskIds: string[] = [];
export const recordIds: string[] = [];

/**
 * Reset tracked IDs to avoid stale state between test suites.
 * Call in beforeEach or afterAll to ensure deterministic cleanup.
 */
export function resetTrackedIds(): void {
  taskIds.length = 0;
  recordIds.length = 0;
}

export function getData(body: any): any {
  return body?.data ?? body;
}

export function getTemplateFields() {
  return [
    { name: 'temperature', type: 'number', required: true, min: 0, max: 200 },
    { name: 'pressure', type: 'number', required: false },
    { name: 'notes', type: 'text', required: false, maxLength: 500 },
  ];
}

export async function seedDepts(p: PrismaService) {
  await p.department.createMany({
    data: [
      { id: IDS.dept, code: `${TEST_PREFIX}-cd`, name: 'Dept', status: 'active' },
      { id: IDS.otherDept, code: `${TEST_PREFIX}-co`, name: 'Other', status: 'active' },
    ],
  });
}

export async function seedUsers(p: PrismaService, hash: string) {
  await p.user.createMany({
    data: [
      { id: IDS.admin, username: `${TEST_PREFIX}-admin`, password: hash, name: 'A', role: 'admin', departmentId: IDS.dept, status: 'active' },
      { id: IDS.leader, username: `${TEST_PREFIX}-leader`, password: hash, name: 'L', role: 'leader', departmentId: IDS.dept, status: 'active' },
      { id: IDS.member, username: `${TEST_PREFIX}-member`, password: hash, name: 'M', role: 'user', departmentId: IDS.dept, status: 'active' },
      { id: IDS.otherMember, username: `${TEST_PREFIX}-other`, password: hash, name: 'O', role: 'user', departmentId: IDS.otherDept, status: 'active' },
    ],
  });
}

export async function seedTemplates(p: PrismaService) {
  const fields = getTemplateFields();
  await p.template.createMany({
    data: [
      { id: IDS.tmpl, number: `${TEST_PREFIX}-T1`, title: 'Active', fieldsJson: fields, version: 1.0, status: 'active', creatorId: IDS.admin },
      { id: IDS.tmplInactive, number: `${TEST_PREFIX}-T2`, title: 'Inactive', fieldsJson: fields, version: 1.0, status: 'inactive', creatorId: IDS.admin },
    ],
  });
}

export async function cleanDeviations(p: PrismaService) {
  if (recordIds.length === 0) return;
  await p.deviationReport.deleteMany({ where: { recordId: { in: recordIds } } });
}

export async function cleanRecords(p: PrismaService) {
  if (taskIds.length === 0) return;
  await p.taskRecord.deleteMany({ where: { taskId: { in: taskIds } } });
}

export async function cleanTasks(p: PrismaService) {
  if (taskIds.length === 0) return;
  await p.task.deleteMany({ where: { id: { in: taskIds } } });
}

export async function cleanNotifications(p: PrismaService) {
  await p.notification.deleteMany({ where: { userId: { in: ALL_USER_IDS } } });
}

export async function cleanTemplates(p: PrismaService) {
  await p.template.deleteMany({ where: { id: { in: ALL_TMPL_IDS } } });
}

export async function cleanUsers(p: PrismaService) {
  await p.user.deleteMany({ where: { id: { in: ALL_USER_IDS } } });
}

export async function cleanDepts(p: PrismaService) {
  await p.department.deleteMany({ where: { id: { in: ALL_DEPT_IDS } } });
}

export async function doLogin(app: INestApplication, username: string, pw: string) {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ username, password: pw });
  return res.body.data?.token || res.body.token;
}

export async function apiCreateTask(app: INestApplication, token: string, overrides: any = {}) {
  const res = await request(app.getHttpServer())
    .post('/api/v1/tasks')
    .set('Authorization', `Bearer ${token}`)
    .send({ templateId: IDS.tmpl, departmentId: IDS.dept, deadline: FUTURE_DL, ...overrides });
  const data = getData(res.body);
  if (data?.id) taskIds.push(data.id);
  return { response: res, data };
}

export async function apiCancelTask(app: INestApplication, id: string, token: string) {
  return request(app.getHttpServer())
    .post(`/api/v1/tasks/${id}/cancel`)
    .set('Authorization', `Bearer ${token}`);
}

export async function apiSubmitTask(app: INestApplication, id: string, token: string, body: any = { temperature: 95 }) {
  const res = await request(app.getHttpServer())
    .post(`/api/v1/tasks/${id}/submit`)
    .set('Authorization', `Bearer ${token}`)
    .send({ data: body });
  const data = getData(res.body);
  if (data?.id) recordIds.push(data.id);
  return { response: res, data };
}
