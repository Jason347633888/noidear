// =========================================================================
// Training Management Type Definitions
// =========================================================================

// Training Plan Status
export type TrainingPlanStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected';

// Training Project Status
export type TrainingProjectStatus = 'planned' | 'ongoing' | 'completed' | 'cancelled';

// Question Type
export type QuestionType = 'choice' | 'judge';

// Todo Task Type
export type TodoTaskType =
  | 'training_organize'
  | 'training_attend'
  | 'approval'
  | 'equipment_maintain'
  | 'inventory'
  | 'change_request';

// Todo Task Status
export type TodoTaskStatus = 'pending' | 'completed';

// Todo Task Priority
export type TodoTaskPriority = 'low' | 'normal' | 'high' | 'urgent';

// =========================================================================
// Training Plan
// =========================================================================

export interface TrainingPlan {
  id: string;
  year: number;
  title: string;
  status: TrainingPlanStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    username: string;
    name: string;
  };
  projects?: TrainingProject[];
  projectCount?: number;
}

export interface CreateTrainingPlanDto {
  year: number;
  title: string;
}

export interface UpdateTrainingPlanDto {
  title?: string;
  status?: TrainingPlanStatus;
}

// =========================================================================
// Training Project
// =========================================================================

export interface TrainingProject {
  id: string;
  planId: string;
  title: string;
  description?: string;
  department: string;
  quarter: number;
  trainerId: string;
  trainees: string[];
  scheduledDate?: string;
  documentIds: string[];
  passingScore: number;
  maxAttempts: number;
  status: TrainingProjectStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  plan?: TrainingPlan;
  trainer?: {
    id: string;
    username: string;
    name: string;
  };
  traineeList?: Array<{
    id: string;
    username: string;
    name: string;
    department?: string;
  }>;
  documents?: Array<{
    id: string;
    code: string;
    title: string;
    level: number;
  }>;
  questions?: TrainingQuestion[];
  learningRecords?: LearningRecord[];
  questionCount?: number;
  traineeCount?: number;
  completedCount?: number;
}

export interface CreateTrainingProjectDto {
  planId: string;
  title: string;
  description?: string;
  department: string;
  quarter: number;
  trainerId: string;
  trainees: string[];
  scheduledDate?: string;
  documentIds?: string[];
  passingScore: number;
  maxAttempts: number;
}

export interface UpdateTrainingProjectDto {
  title?: string;
  description?: string;
  department?: string;
  quarter?: number;
  trainerId?: string;
  scheduledDate?: string;
  documentIds?: string[];
  passingScore?: number;
  maxAttempts?: number;
  status?: TrainingProjectStatus;
}

// =========================================================================
// Training Question
// =========================================================================

export interface TrainingQuestion {
  id: string;
  projectId: string;
  type: QuestionType;
  content: string;
  options?: string[]; // For choice questions: ['A', 'B', 'C', 'D']
  correctAnswer: string; // For choice: 'A'/'B'/'C'/'D', For judge: 'true'/'false'
  points: number;
  order: number;
  createdAt: string;
}

export interface CreateQuestionDto {
  projectId: string;
  type: QuestionType;
  content: string;
  options?: string[];
  correctAnswer: string;
  points: number;
  order?: number;
}

export interface UpdateQuestionDto {
  content?: string;
  options?: string[];
  correctAnswer?: string;
  points?: number;
  order?: number;
}

// =========================================================================
// Learning Record
// =========================================================================

export interface LearningRecord {
  id: string;
  projectId: string;
  userId: string;
  examScore?: number;
  attempts: number;
  passed: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    username: string;
    name: string;
    department?: string;
  };
  project?: TrainingProject;
  examRecords?: ExamRecord[];
}

// =========================================================================
// Exam Record
// =========================================================================

export interface ExamRecord {
  id: string;
  learningRecordId: string;
  answers: Record<string, string>; // { questionId: answer }
  score: number;
  submittedAt: string;
  createdAt: string;
}

export interface StartExamResponse {
  questions: Array<{
    id: string;
    type: QuestionType;
    content: string;
    options?: string[];
    points: number;
    order: number;
  }>;
  projectInfo: {
    title: string;
    passingScore: number;
    maxAttempts: number;
    remainingAttempts: number;
  };
}

export interface SubmitExamDto {
  projectId: string;
  answers: Record<string, string>;
}

export interface ExamResultResponse {
  score: number;
  passed: boolean;
  correctCount: number;
  totalCount: number;
  remainingAttempts: number;
  examRecord: ExamRecord;
}

// =========================================================================
// Training Archive
// =========================================================================

export interface TrainingArchive {
  id: string;
  projectId: string;
  documentId?: string;
  pdfPath: string;
  generatedAt: string;
  createdAt: string;
  project?: TrainingProject;
  document?: {
    id: string;
    code: string;
    title: string;
  };
}

// =========================================================================
// Todo Task
// =========================================================================

export interface TodoTask {
  id: string;
  userId: string;
  type: TodoTaskType;
  relatedId: string;
  title: string;
  description?: string;
  status: TodoTaskStatus;
  priority: TodoTaskPriority;
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  isOverdue?: boolean;
}

export interface TodoStatistics {
  total: number;
  pending: number;
  completed: number;
  overdue: number;
  byType: Record<TodoTaskType, number>;
}

// =========================================================================
// API Query Parameters
// =========================================================================

export interface TrainingPlanQueryDto {
  page?: number;
  limit?: number;
  year?: number;
  status?: TrainingPlanStatus;
  keyword?: string;
}

export interface TrainingProjectQueryDto {
  page?: number;
  limit?: number;
  planId?: string;
  department?: string;
  quarter?: number;
  status?: TrainingProjectStatus;
  keyword?: string;
}

export interface QuestionQueryDto {
  projectId: string;
}

export interface LearningRecordQueryDto {
  projectId?: string;
  userId?: string;
}

export interface TodoTaskQueryDto {
  page?: number;
  limit?: number;
  type?: TodoTaskType;
  status?: TodoTaskStatus;
  priority?: TodoTaskPriority;
  sortBy?: 'dueDate' | 'priority' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

// =========================================================================
// Pagination Response
// =========================================================================

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
