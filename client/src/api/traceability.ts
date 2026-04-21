import request from './request';

export const traceabilityApi = {
  forwardTrace: (materialBatchId: string) =>
    request.get(`/traceability/forward/${materialBatchId}`),
  backwardTrace: (productionBatchId: string) =>
    request.get(`/traceability/backward/${productionBatchId}`),
  materialBalance: (productionBatchId: string) =>
    request.get(`/traceability/balance/${productionBatchId}`),
};
