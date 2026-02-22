import request from './request';
import type {
  TrainingQuestion,
  CreateQuestionDto,
  UpdateQuestionDto,
  QuestionQueryDto,
  StartExamResponse,
  SubmitExamDto,
  ExamResultResponse,
} from '@/types/training';

// =========================================================================
// Exam Question APIs
// =========================================================================

/**
 * Create a new exam question
 */
export const createQuestion = (data: CreateQuestionDto): Promise<TrainingQuestion> => {
  return request.post('/training/questions', data);
};

/**
 * Get question list by project ID
 */
export const getQuestions = (params: QuestionQueryDto): Promise<TrainingQuestion[]> => {
  return request.get('/training/questions', { params });
};

/**
 * Update question
 */
export const updateQuestion = (id: string, data: UpdateQuestionDto): Promise<TrainingQuestion> => {
  return request.put(`/training/questions/${id}`, data);
};

/**
 * Delete question (planned status only)
 */
export const deleteQuestion = (id: string): Promise<void> => {
  return request.delete(`/training/questions/${id}`);
};

/**
 * Batch update question order
 */
export const updateQuestionOrder = (
  questions: Array<{ id: string; order: number }>,
): Promise<void> => {
  return request.put('/training/questions/order', { questions });
};

// =========================================================================
// Exam APIs
// =========================================================================

/**
 * Start exam (get questions without correct answers)
 */
export const startExam = (projectId: string): Promise<StartExamResponse> => {
  return request.post('/training/exam/start', { projectId });
};

/**
 * Submit exam answers (auto-grading)
 */
export const submitExam = (data: SubmitExamDto): Promise<ExamResultResponse> => {
  return request.post('/training/exam/submit', data);
};
