import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';

export const TEST_PREFIX = `e2e-training-${Date.now()}`;

export const IDS = {
  admin: `${TEST_PREFIX}-admin`,
  trainer: `${TEST_PREFIX}-trainer`,
  trainee1: `${TEST_PREFIX}-trainee1`,
  trainee2: `${TEST_PREFIX}-trainee2`,
  dept: `${TEST_PREFIX}-dept`,
  plan2025: `${TEST_PREFIX}-plan-2025`,
  plan2026: `${TEST_PREFIX}-plan-2026`,
};

export const ALL_USER_IDS = [IDS.admin, IDS.trainer, IDS.trainee1, IDS.trainee2];
export const planIds: string[] = [];
export const projectIds: string[] = [];
export const questionIds: string[] = [];

export function resetTrackedIds(): void {
  planIds.length = 0;
  projectIds.length = 0;
  questionIds.length = 0;
}

export function getData(body: any): any {
  return body?.data ?? body;
}

export async function seedDept(p: PrismaService) {
  await p.department.create({
    data: {
      id: IDS.dept,
      code: `${TEST_PREFIX}-QA`,
      name: 'Quality Assurance',
      status: 'active',
    },
  });
}

export async function seedUsers(p: PrismaService, hash: string) {
  await p.user.createMany({
    data: [
      {
        id: IDS.admin,
        username: `${TEST_PREFIX}-admin`,
        password: hash,
        name: 'Admin',
        role: 'admin',
        departmentId: IDS.dept,
        status: 'active',
      },
      {
        id: IDS.trainer,
        username: `${TEST_PREFIX}-trainer`,
        password: hash,
        name: 'Trainer',
        role: 'user',
        departmentId: IDS.dept,
        status: 'active',
      },
      {
        id: IDS.trainee1,
        username: `${TEST_PREFIX}-trainee1`,
        password: hash,
        name: 'Trainee 1',
        role: 'user',
        departmentId: IDS.dept,
        status: 'active',
      },
      {
        id: IDS.trainee2,
        username: `${TEST_PREFIX}-trainee2`,
        password: hash,
        name: 'Trainee 2',
        role: 'user',
        departmentId: IDS.dept,
        status: 'active',
      },
    ],
  });
}

export async function cleanTodos(p: PrismaService) {
  await p.todoTask.deleteMany({
    where: { userId: { in: ALL_USER_IDS } },
  });
}

export async function cleanExams(p: PrismaService) {
  if (projectIds.length === 0) return;

  const learningRecords = await p.learningRecord.findMany({
    where: { projectId: { in: projectIds } },
    select: { id: true },
  });
  const learningRecordIds = learningRecords.map(r => r.id);

  if (learningRecordIds.length > 0) {
    await p.examRecord.deleteMany({
      where: { learningRecordId: { in: learningRecordIds } },
    });
  }

  await p.trainingQuestion.deleteMany({
    where: { projectId: { in: projectIds } },
  });
}

export async function cleanRecords(p: PrismaService) {
  if (projectIds.length === 0) return;
  await p.learningRecord.deleteMany({
    where: { projectId: { in: projectIds } },
  });
}

export async function cleanArchives(p: PrismaService) {
  await p.trainingArchive.deleteMany({
    where: {
      project: {
        title: { contains: TEST_PREFIX },
      },
    },
  });
}

export async function cleanProjects(p: PrismaService) {
  if (projectIds.length === 0) return;
  await p.trainingProject.deleteMany({
    where: { id: { in: projectIds } },
  });
}

export async function cleanPlans(p: PrismaService) {
  if (planIds.length === 0) return;
  await p.trainingPlan.deleteMany({
    where: { id: { in: planIds } },
  });
}

export async function cleanUsers(p: PrismaService) {
  await p.user.deleteMany({
    where: { id: { in: ALL_USER_IDS } },
  });
}

export async function cleanDept(p: PrismaService) {
  await p.department.delete({ where: { id: IDS.dept } });
}

export async function doLogin(
  app: INestApplication,
  username: string,
  password: string,
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ username, password })
    .expect(200);
  const data = getData(res.body);
  return data.token;
}

export async function apiCreatePlan(
  app: INestApplication,
  token: string,
  year: number,
  title: string,
) {
  const response = await request(app.getHttpServer())
    .post('/api/v1/training/plans')
    .set('Authorization', `Bearer ${token}`)
    .send({ year, title });
  const data = getData(response.body);
  if (response.status === 201 && data?.id) {
    planIds.push(data.id);
  }
  return { response, data };
}

export async function apiCreateProject(
  app: INestApplication,
  token: string,
  planId: string,
  overrides: any = {},
) {
  const response = await request(app.getHttpServer())
    .post('/api/v1/training/projects')
    .set('Authorization', `Bearer ${token}`)
    .send({
      planId,
      title: `${TEST_PREFIX} Project`,
      department: 'QA',
      quarter: 1,
      trainerId: IDS.trainer,
      trainees: [IDS.trainee1, IDS.trainee2],
      scheduledDate: new Date(Date.now() + 30 * 86400000),
      passingScore: 60,
      maxAttempts: 3,
      ...overrides,
    });
  const data = getData(response.body);
  if (response.status === 201 && data?.id) {
    projectIds.push(data.id);
  }
  return { response, data };
}

export async function apiCreateQuestion(
  app: INestApplication,
  token: string,
  projectId: string,
  overrides: any = {},
) {
  const response = await request(app.getHttpServer())
    .post('/api/v1/training/questions')
    .set('Authorization', `Bearer ${token}`)
    .send({
      projectId,
      type: 'choice',
      content: 'Test Question',
      options: { A: 'Option A', B: 'Option B' },
      correctAnswer: 'A',
      points: 50,
      ...overrides,
    });
  const data = getData(response.body);
  if (response.status === 201 && data?.id) {
    questionIds.push(data.id);
  }
  return { response, data };
}
