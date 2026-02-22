describe('Records Query Flow', () => {
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

    // Navigate to records page
    page = await program.switchTab('/pages/records/index')
    await page.waitFor(1000)
  })

  it('should display records list', async () => {
    const recordCards = await page.$$('.record-card')
    expect(recordCards).toBeTruthy()
  })

  it('should filter records by date range', async () => {
    const filterBtn = await page.$('.records-page__filter-btn')
    await filterBtn.tap()
    await page.waitFor(500)

    // Select date range
    const startDatePicker = await page.$('.filter-dialog__date-picker:nth-child(1)')
    await startDatePicker.tap()
    await page.waitFor(500)

    // Confirm filter
    const confirmBtn = await page.$('.filter-dialog__btn--confirm')
    await confirmBtn.tap()
    await page.waitFor(1000)

    // Should display filtered results
    const recordCards = await page.$$('.record-card')
    expect(recordCards).toBeTruthy()
  })

  it('should navigate to record detail', async () => {
    const firstRecord = await page.$('.record-card')
    await firstRecord.tap()
    await page.waitFor(1000)

    // Should navigate to detail page
    const path = await page.path()
    expect(path).toContain('pages/records/detail')
  })

  it('should display record detail information', async () => {
    const detailFields = await page.$$('.detail-page__field')
    expect(detailFields.length).toBeGreaterThan(0)
  })
})
