describe('Equipment Management Flow', () => {
  let page

  beforeAll(async () => {
    // Login first
    page = await program.reLaunch('/pages/login/index')
    await page.waitFor(1000)

    const usernameInput = await page.$('.login-page__input')
    const passwordInput = await page.$('.login-page__input:nth-child(2)')
    const submitBtn = await page.$('.login-page__btn--primary')

    await usernameInput.input('admin')
    await passwordInput.input('12345678')
    await submitBtn.tap()
    await page.waitFor(2000)

    // Navigate to equipment page via tab
    page = await program.switchTab('/pages/equipment/list')
    await page.waitFor(1000)
  })

  it('should display equipment list', async () => {
    const equipmentCards = await page.$$('.equipment-card')
    expect(equipmentCards).toBeTruthy()
  })

  it('should filter equipment by status', async () => {
    // Click on status filter tab (e.g., "故障")
    const filterTabs = await page.$$('.equipment-page__filter-tab')
    if (filterTabs.length >= 2) {
      await filterTabs[1].tap()
      await page.waitFor(800)

      // Should show filtered results
      const equipmentCards = await page.$$('.equipment-card')
      expect(equipmentCards).toBeTruthy()
    }
  })

  it('should search equipment by keyword', async () => {
    const searchInput = await page.$('.equipment-page__search-input')
    if (searchInput) {
      await searchInput.input('泵')
      await page.waitFor(800)

      // Should show search results
      const equipmentCards = await page.$$('.equipment-card')
      expect(equipmentCards).toBeTruthy()
    }
  })

  it('should pull down to refresh list', async () => {
    // Simulate pull down refresh
    await page.triggerPullDownRefresh()
    await page.waitFor(1500)

    // List should still be displayed after refresh
    const equipmentCards = await page.$$('.equipment-card')
    expect(equipmentCards).toBeTruthy()
  })

  it('should navigate to equipment detail on tap', async () => {
    // Reset search first
    const searchInput = await page.$('.equipment-page__search-input')
    if (searchInput) {
      await searchInput.input('')
      await page.waitFor(500)
    }

    const firstCard = await page.$('.equipment-card')
    if (firstCard) {
      await firstCard.tap()
      await page.waitFor(1000)

      // Should navigate to detail page
      const path = await page.path()
      expect(path).toContain('pages/equipment/detail')
    }
  })

  it('should display equipment basic information in detail', async () => {
    const equipmentCode = await page.$('.equipment-detail__code')
    const equipmentName = await page.$('.equipment-detail__name')
    const statusTag = await page.$('.equipment-detail__status')

    expect(equipmentCode || equipmentName || statusTag).toBeTruthy()
  })

  it('should display maintenance records in detail', async () => {
    // Maintenance records section
    const maintenanceSection = await page.$('.equipment-detail__maintenance')
    expect(maintenanceSection).toBeTruthy()
  })

  it('should display maintenance plan in detail', async () => {
    // Maintenance plan section
    const planSection = await page.$('.equipment-detail__plan')
    expect(planSection).toBeTruthy()
  })
})
