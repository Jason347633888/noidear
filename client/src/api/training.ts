import request from './request';
import type {
  TrainingPlan,
  TrainingProject,
  LearningRecord,
  CreateTrainingPlanDto,
  UpdateTrainingPlanDto,
  CreateTrainingProjectDto,
  UpdateTrainingProjectDto,
  TrainingPlanQueryDto,
  TrainingProjectQueryDto,
  LearningRecordQueryDto,
  PaginatedResponse,
} from '@/types/training';

// =========================================================================
// Training Plan APIs
// =========================================================================

/**
 * Create a new training plan
 */
export const createTrainingPlan = (data: CreateTrainingPlanDto): Promise<TrainingPlan> => {
  return request.post('/training/plans', data);
};

/**
 * Get training plan list with pagination
 */
export const getTrainingPlans = (
  params?: TrainingPlanQueryDto,
): Promise<PaginatedResponse<TrainingPlan>> => {
  return request.get('/training/plans', { params });
};

/**
 * Get training plan detail by ID
 */
export const getTrainingPlanById = (id: string): Promise<TrainingPlan> => {
  return request.get(`/training/plans/${id}`);
};

/**
 * Update training plan
 */
export const updateTrainingPlan = (
  id: string,
  data: UpdateTrainingPlanDto,
): Promise<TrainingPlan> => {
  return request.put(`/training/plans/${id}`, data);
};

/**
 * Delete training plan (draft only)
 */
export const deleteTrainingPlan = (id: string): Promise<void> => {
  return request.delete(`/training/plans/${id}`);
};

/**
 * Submit training plan for approval
 */
export const submitTrainingPlanForApproval = (id: string): Promise<TrainingPlan> => {
  return request.post(`/training/plans/${id}/submit`);
};

// =========================================================================
// Training Project APIs
// =========================================================================

/**
 * Create a new training project
 */
export const createTrainingProject = (
  data: CreateTrainingProjectDto,
): Promise<TrainingProject> => {
  return request.post('/training/projects', data);
};

/**
 * Get training project list with pagination and filters
 */
export const getTrainingProjects = (
  params?: TrainingProjectQueryDto,
): Promise<PaginatedResponse<TrainingProject>> => {
  return request.get('/training/projects', { params });
};

/**
 * Get training project detail by ID
 */
export const getTrainingProjectById = (id: string): Promise<TrainingProject> => {
  return request.get(`/training/projects/${id}`);
};

/**
 * Update training project
 */
export const updateTrainingProject = (
  id: string,
  data: UpdateTrainingProjectDto,
): Promise<TrainingProject> => {
  return request.put(`/training/projects/${id}`, data);
};

/**
 * Delete training project (planned only)
 */
export const deleteTrainingProject = (id: string): Promise<void> => {
  return request.delete(`/training/projects/${id}`);
};

/**
 * Add trainee to training project
 */
export const addTrainee = (projectId: string, userId: string): Promise<void> => {
  return request.post(`/training/projects/${projectId}/trainees`, { userId });
};

/**
 * Remove trainee from training project
 */
export const removeTrainee = (projectId: string, userId: string): Promise<void> => {
  return request.delete(`/training/projects/${projectId}/trainees/${userId}`);
};

/**
 * Start training project (change status to ongoing)
 */
export const startTrainingProject = (id: string): Promise<TrainingProject> => {
  return request.post(`/training/projects/${id}/start`);
};

/**
 * Complete training project
 */
export const completeTrainingProject = (id: string): Promise<TrainingProject> => {
  return request.post(`/training/projects/${id}/complete`);
};

/**
 * Cancel training project
 */
export const cancelTrainingProject = (id: string, reason?: string): Promise<TrainingProject> => {
  return request.post(`/training/projects/${id}/cancel`, { reason });
};

// =========================================================================
// Learning Record APIs
// =========================================================================

/**
 * Get learning records (for project or user)
 */
export const getLearningRecords = (
  params?: LearningRecordQueryDto,
): Promise<LearningRecord[]> => {
  return request.get('/training/records', { params });
};

/**
 * Get my learning records
 */
export const getMyLearningRecords = (): Promise<LearningRecord[]> => {
  return request.get('/training/records/my');
};

/**
 * Get exam records history for a learning record
 */
export const getExamRecordsHistory = (learningRecordId: string): Promise<any[]> => {
  return request.get(`/training/records/${learningRecordId}/exams`);
};
