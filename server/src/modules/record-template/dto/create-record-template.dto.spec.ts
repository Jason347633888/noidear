import { validate } from 'class-validator';
import { CreateRecordTemplateDto } from './create-record-template.dto';

describe('CreateRecordTemplateDto', () => {
  it('rejects finished_goods for new record template batch links', async () => {
    const dto = Object.assign(new CreateRecordTemplateDto(), {
      name: '模板',
      code: 'TPL-001',
      fieldsJson: { sections: [] },
      batchLinkType: 'finished_goods',
    });

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'batchLinkType')).toBe(true);
  });

  it('accepts production as batchLinkType', async () => {
    const dto = Object.assign(new CreateRecordTemplateDto(), {
      name: '模板',
      code: 'TPL-001',
      fieldsJson: { sections: [] },
      batchLinkType: 'production',
    });

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'batchLinkType')).toBe(false);
  });
});
