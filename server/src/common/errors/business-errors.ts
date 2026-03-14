/**
 * 机器可读业务错误
 * 格式：{ code, message, context, fix }
 * 供 Agent 解析和自动修复
 */
export const BusinessError = {
  wrongStep: (current: number, attempted: number) => ({
    code: 'PROCESS_WRONG_STEP',
    message: '步骤不匹配',
    context: { current, attempted },
    fix: `请先完成 step ${current}，当前步骤完成后自动解锁 step ${current + 1}`,
  }),

  processCompleted: (instanceId: string) => ({
    code: 'PROCESS_ALREADY_COMPLETED',
    message: '流程已完成',
    context: { instanceId },
    fix: '已完成的流程不可再编辑，如需重新开发请创建新的流程实例',
  }),

  notOwner: (action: string) => ({
    code: 'PROCESS_NOT_OWNER',
    message: '权限不足：非创建者',
    context: { action },
    fix: '只有流程创建者才能执行此操作',
  }),

  stepNotSubmitted: (stepNumber: number) => ({
    code: 'PROCESS_STEP_NOT_SUBMITTED',
    message: '步骤尚未提交，无法审批',
    context: { stepNumber },
    fix: `步骤 ${stepNumber} 必须先提交（saveAsDraft=false）才能进行审批`,
  }),
} as const;
