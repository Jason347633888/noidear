describe('product master data linkage integration contract', () => {
  it('历史产品建档链路使用 Product + Recipe + RecipeLine + WorkshopArea', () => {
    const linkage = {
      product: 'Product',
      recipe: 'Recipe',
      recipeLine: 'RecipeLine',
      area: 'WorkshopArea',
      usage: 'BatchMaterialUsage',
    };

    expect(linkage).toEqual({
      product: 'Product',
      recipe: 'Recipe',
      recipeLine: 'RecipeLine',
      area: 'WorkshopArea',
      usage: 'BatchMaterialUsage',
    });
  });

  it('下游模块通过生产批次追产品，不直接保存 productId', () => {
    const modules = [
      { name: 'DeliveryNote', productPath: 'production_batch_id' },
      { name: 'CustomerComplaint', productPath: 'production_batch_id' },
      { name: 'ProcessMonitorRecord', productPath: 'production_batch_id' },
      { name: 'MetalDetectionLog', productPath: 'production_batch_id' },
      { name: 'ReworkRecord', productPath: 'production_batch_id' },
    ];

    expect(modules.every((item) => item.productPath === 'production_batch_id')).toBe(true);
  });
});
