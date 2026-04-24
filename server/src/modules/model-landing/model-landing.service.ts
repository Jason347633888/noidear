import { Injectable, NotFoundException } from '@nestjs/common';
import {
  MODEL_LANDING_FORMS,
  MODEL_LANDING_GROUPS,
  MODEL_LANDING_SUMMARY,
} from './generated/model-landing.generated';

@Injectable()
export class ModelLandingService {
  getSummary() {
    return MODEL_LANDING_SUMMARY;
  }

  listGroups() {
    return MODEL_LANDING_GROUPS;
  }

  getGroup(groupId: string) {
    const group = MODEL_LANDING_GROUPS.find((item) => item.id === groupId);
    if (!group) {
      throw new NotFoundException(`Unknown model landing group: ${groupId}`);
    }

    return {
      ...group,
      forms: MODEL_LANDING_FORMS.filter((row) => row.templateGroupId === groupId),
    };
  }

  getFormByCode(code: string) {
    const form = MODEL_LANDING_FORMS.find((row) => row.code === code);
    if (!form) {
      throw new NotFoundException(`Unknown model landing form code: ${code}`);
    }
    return form;
  }
}
