import { mount } from '@vue/test-utils';
import FirstReleaseSmoke from '../FirstReleaseSmoke.vue';

describe('FirstReleaseSmoke', () => {
  it('lists the first-release closed-loop steps', () => {
    const wrapper = mount(FirstReleaseSmoke);
    expect(wrapper.text()).toContain('公司配置');
    expect(wrapper.text()).toContain('来料登记与检验');
    expect(wrapper.text()).toContain('生产计划与现场任务');
    expect(wrapper.text()).toContain('追溯快照与证据导出');
  });
});
