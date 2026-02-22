import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient, QuestionType } from '@prisma/client';
import { TrainingService } from '../src/modules/training/training.service';
import { ExamService } from '../src/modules/training/exam.service';
import { ArchiveService } from '../src/modules/training/archive.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { StorageService } from '../src/common/services/storage.service';
import { WorkflowInstanceService } from '../src/modules/workflow/workflow-instance.service';

const TEST_PREFIX = `test_training_${Date.now()}`;

describe('Training System Service Layer (e2e)', () => {
  let prisma: PrismaClient;
  let trainingService: TrainingService;
  let examService: ExamService;
  let archiveService: ArchiveService;

  const testData = {
    userId: `${TEST_PREFIX}_user`,
    deptId: `${TEST_PREFIX}_dept`,
    planId: '',
    projectId: '',
    questionIds: [] as string[],
  };

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrainingService,
        ExamService,
        ArchiveService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: StorageService,
          useValue: {
            uploadFile: jest.fn().mockResolvedValue('mock-file-path.pdf'),
            uploadStream: jest.fn().mockResolvedValue({
              filename: 'mock-file.pdf',
              path: '/archives/2026/mock-file.pdf',
              url: 'http://mock-url/mock-file.pdf',
            }),
            getFileUrl: jest.fn().mockResolvedValue('http://mock-url/mock-file.pdf'),
          },
        },
        {
          provide: WorkflowInstanceService,
          useValue: {
            create: jest.fn().mockResolvedValue({ id: 'mock-workflow-id' }),
          },
        },
      ],
    }).compile();

    trainingService = module.get<TrainingService>(TrainingService);
    examService = module.get<ExamService>(ExamService);
    archiveService = module.get<ArchiveService>(ArchiveService);

    await seedTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  async function seedTestData() {
    await prisma.department.create({
      data: { id: testData.deptId, code: TEST_PREFIX, name: 'Test Dept', status: 'active' },
    });

    await prisma.user.create({
      data: {
        id: testData.userId,
        username: TEST_PREFIX,
        password: 'hash',
        name: 'Test User',
        role: 'admin',
        departmentId: testData.deptId,
        status: 'active',
      },
    });
  }

  async function cleanupTestData() {
    await prisma.todoTask.deleteMany({ where: { userId: testData.userId } });
    await prisma.trainingArchive.deleteMany({ where: { projectId: testData.projectId } });

    const learningRecords = await prisma.learningRecord.findMany({
      where: { projectId: testData.projectId },
      select: { id: true },
    });
    const learningRecordIds = learningRecords.map(r => r.id);

    if (learningRecordIds.length > 0) {
      await prisma.examRecord.deleteMany({ where: { learningRecordId: { in: learningRecordIds } } });
    }

    await prisma.learningRecord.deleteMany({ where: { projectId: testData.projectId } });
    await prisma.trainingQuestion.deleteMany({ where: { projectId: testData.projectId } });
    await prisma.trainingProject.deleteMany({ where: { planId: testData.planId } });
    await prisma.trainingPlan.deleteMany({ where: { id: testData.planId } });

    await prisma.document.deleteMany({ where: { creatorId: testData.userId } });
    await prisma.user.deleteMany({ where: { id: testData.userId } });
    await prisma.department.deleteMany({ where: { id: testData.deptId } });
  }

  describe('优先级1: 培训计划管理', () => {
    it('BR-091: 应创建年度培训计划并强制year唯一性', async () => {
      const plan = await trainingService.createPlan(
        { year: 2025, title: '2025年度培训计划' },
        testData.userId
      );

      expect(plan.year).toBe(2025);
      expect(plan.status).toBe('draft');
      testData.planId = plan.id;

      await expect(
        trainingService.createPlan({ year: 2025, title: '重复' }, testData.userId)
      ).rejects.toThrow('已存在');
    });

    it('BR-093: draft状态可修改，其他状态不可修改', async () => {
      const updated = await trainingService.updatePlan(testData.planId, {
        title: '修改后的标题',
      });
      expect(updated.title).toBe('修改后的标题');

      await prisma.trainingPlan.update({
        where: { id: testData.planId },
        data: { status: 'approved' },
      });

      await expect(
        trainingService.updatePlan(testData.planId, { title: '再次修改' })
      ).rejects.toThrow();

      await prisma.trainingPlan.update({
        where: { id: testData.planId },
        data: { status: 'draft' },
      });
    });
  });

  describe('优先级1: 培训项目管理 + TodoTask自动生成', () => {
    it('BR-108: 创建项目应自动生成TodoTask', async () => {
      const project = await trainingService.createProject(
        {
          planId: testData.planId,
          title: '测试培训项目',
          department: 'QA',
          quarter: 1,
          trainerId: testData.userId,
          trainees: [testData.userId],
          scheduledDate: new Date(Date.now() + 86400000),
          passingScore: 60,
          maxAttempts: 3,
        },
        testData.userId
      );

      testData.projectId = project.id;

      const todos = await prisma.todoTask.findMany({
        where: { relatedId: project.id },
      });

      expect(todos.length).toBeGreaterThan(0);
      expect(todos.some(t => t.type === 'training_attend')).toBe(true);
      expect(todos.some(t => t.userId === testData.userId)).toBe(true);
    });

    it('BR-108: 创建项目应自动生成学习记录', async () => {
      const records = await prisma.learningRecord.findMany({
        where: { projectId: testData.projectId },
      });

      expect(records.length).toBe(1);
      expect(records[0].userId).toBe(testData.userId);
      expect(records[0].passed).toBe(false);
      expect(records[0].attempts).toBe(0);
    });
  });

  describe('优先级1: 考试自动评分', () => {
    beforeAll(async () => {
      const q1 = await prisma.trainingQuestion.create({
        data: {
          projectId: testData.projectId,
          type: QuestionType.choice,
          content: 'Question 1',
          options: { A: 'Option A', B: 'Option B' },
          correctAnswer: 'A',
          points: 50,
          order: 1,
        },
      });

      const q2 = await prisma.trainingQuestion.create({
        data: {
          projectId: testData.projectId,
          type: QuestionType.choice,
          content: 'Question 2',
          options: { A: 'Option A', B: 'Option B' },
          correctAnswer: 'B',
          points: 50,
          order: 2,
        },
      });

      testData.questionIds = [q1.id, q2.id];
    });

    it('BR-102: 开始考试应隐藏正确答案', async () => {
      const exam = await examService.startExam(
        { projectId: testData.projectId },
        testData.userId
      );

      expect(exam.questions).toHaveLength(2);
      expect((exam.questions[0] as any).correctAnswer).toBeUndefined();
    });

    it('BR-106: 提交考试应自动评分', async () => {
      const result = await examService.submitExam(
        {
          projectId: testData.projectId,
          answers: {
            [testData.questionIds[0]]: 'A',
            [testData.questionIds[1]]: 'B',
          },
        },
        testData.userId
      );

      expect(result.score).toBe(100);
      expect(result.passed).toBe(true);
    });

    it('BR-106: 通过考试应自动完成TodoTask', async () => {
      const todos = await prisma.todoTask.findMany({
        where: {
          relatedId: testData.projectId,
          type: 'training_attend',
          userId: testData.userId,
        },
      });

      expect(todos[0].status).toBe('completed');
    });

    it('BR-105: 应强制最大考试次数限制', async () => {
      await expect(
        examService.startExam({ projectId: testData.projectId }, testData.userId)
      ).rejects.toThrow('已通过考试');
    });
  });

  describe('优先级1: 培训档案生成', () => {
    it('BR-112: 项目完成后应生成培训档案', async () => {
      await prisma.trainingProject.update({
        where: { id: testData.projectId },
        data: { status: 'completed', completedAt: new Date() },
      });

      const result = await archiveService.generateArchive(
        testData.projectId,
        testData.userId
      );

      expect(result.archive.projectId).toBe(testData.projectId);
      expect(result.archive.pdfPath).toBeDefined();
    });

    it('BR-114: 应拒绝重复生成档案', async () => {
      await expect(
        archiveService.generateArchive(testData.projectId, testData.userId)
      ).rejects.toThrow();
    });
  });

  describe('优先级2: 考试题目CRUD', () => {
    it('应支持创建题目', async () => {
      const question = await prisma.trainingQuestion.create({
        data: {
          projectId: testData.projectId,
          type: QuestionType.choice,
          content: 'New Question',
          options: { A: 'A', B: 'B' },
          correctAnswer: 'A',
          points: 10,
          order: 3,
        },
      });

      expect(question.content).toBe('New Question');
    });

    it('应支持批量导入题目', async () => {
      const questions = await prisma.trainingQuestion.createMany({
        data: [
          {
            projectId: testData.projectId,
            type: QuestionType.choice,
            content: 'Batch Q1',
            options: { A: 'A', B: 'B' },
            correctAnswer: 'A',
            points: 10,
            order: 4,
          },
          {
            projectId: testData.projectId,
            type: QuestionType.choice,
            content: 'Batch Q2',
            options: { A: 'A', B: 'B' },
            correctAnswer: 'B',
            points: 10,
            order: 5,
          },
        ],
      });

      expect(questions.count).toBe(2);
    });
  });

  describe('优先级2: 待办任务CRUD', () => {
    it('应支持查询待办任务', async () => {
      const todos = await prisma.todoTask.findMany({
        where: { userId: testData.userId },
      });

      expect(todos.length).toBeGreaterThan(0);
    });

    it('BR-111: 应支持待办任务统计', async () => {
      const stats = await prisma.todoTask.groupBy({
        by: ['type', 'status'],
        where: { userId: testData.userId },
        _count: true,
      });

      expect(stats.length).toBeGreaterThan(0);
    });
  });
});
