import request from './request';

export interface MixingLineInput {
  recipeLineId: string;
  materialBatchId: string;
  actualQuantity: number;
  manualOverride: boolean;
  overrideReason?: string;
}

export interface CreateMixingExecutionPayload {
  recipeId: string;
  productId: string;
  areaId: string;
  workDate: string;
  actualWeight: number;
  lines: MixingLineInput[];
}

export const mixingApi = {
  recommendMaterialBatches(data: { areaId: string; materialId: string; requiredQuantity: number }) {
    return request.post('/mixing/recommend-material-batches', data);
  },

  createExecution(data: CreateMixingExecutionPayload) {
    return request.post('/mixing/executions', data);
  },
};
