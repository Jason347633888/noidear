describe('Offline Sync Flow', () => {
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
  })

  it('should save data offline when network is unavailable', async () => {
    // Simulate network offline
    await page.callMethod('uni.setStorageSync', 'networkStatus', 'offline')

    // Navigate to form page
    page = await program.navigateTo('/pages/form/index?templateId=1')
    await page.waitFor(1000)

    // Fill and submit form
    const textInput = await page.$('.dynamic-form__input')
    await textInput.input('Offline test data')

    const submitBtn = await page.$('.dynamic-form__btn--primary')
    await submitBtn.tap()
    await page.waitFor(500)

    // Should show offline save toast
    const toast = await page.data('$uniShowToastOptions')
    expect(toast.title).toContain('离线保存成功')
  })

  it('should display pending sync count', async () => {
    // Navigate to user page
    page = await program.switchTab('/pages/user/index')
    await page.waitFor(1000)

    // Check sync status menu item
    const syncMenuItem = await page.$('.user-page__menu-item:nth-child(2)')
    const badge = await syncMenuItem.$('.user-page__menu-badge')

    expect(badge).toBeTruthy()
  })

  it('should sync data when network is back online', async () => {
    // Simulate network online
    await page.callMethod('uni.setStorageSync', 'networkStatus', 'online')

    // Tap sync status
    const syncMenuItem = await page.$('.user-page__menu-item:nth-child(2)')
    await syncMenuItem.tap()
    await page.waitFor(500)

    // Confirm sync
    await page.callMethod('uni.showModal', {
      title: '同步状态',
      success: (res) => {
        if (res.confirm) {
          return true
        }
      },
    })
    await page.waitFor(2000)

    // Should show sync success
    const toast = await page.data('$uniShowToastOptions')
    expect(toast.title).toContain('同步完成')
  })
})
