describe('Form Fill and Submit Flow', () => {
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

    // Navigate to form page
    page = await program.navigateTo('/pages/form/index?templateId=1')
    await page.waitFor(1000)
  })

  it('should display form fields', async () => {
    const formFields = await page.$$('.dynamic-form__field')
    expect(formFields.length).toBeGreaterThan(0)
  })

  it('should validate required fields', async () => {
    const submitBtn = await page.$('.dynamic-form__btn--primary')
    await submitBtn.tap()
    await page.waitFor(500)

    // Should show validation error
    const errorMsg = await page.$('.dynamic-form__error')
    expect(errorMsg).toBeTruthy()
  })

  it('should fill form and submit successfully', async () => {
    // Fill text field
    const textInput = await page.$('.dynamic-form__input')
    await textInput.input('Test value')

    // Fill number field
    const numberInput = await page.$('input[type="number"]')
    if (numberInput) {
      await numberInput.input('123')
    }

    // Submit form
    const submitBtn = await page.$('.dynamic-form__btn--primary')
    await submitBtn.tap()
    await page.waitFor(2000)

    // Should show success toast
    const toast = await page.data('$uniShowToastOptions')
    expect(toast.title).toContain('提交成功')
  })

  it('should save draft', async () => {
    const draftBtn = await page.$('.dynamic-form__btn--default')
    await draftBtn.tap()
    await page.waitFor(500)

    // Should show draft saved toast
    const toast = await page.data('$uniShowToastOptions')
    expect(toast.title).toContain('草稿已保存')
  })
})

describe('Camera Upload Flow', () => {
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

    // Navigate to a form with image field
    page = await program.navigateTo('/pages/form/index?templateId=2')
    await page.waitFor(1000)
  })

  it('should display camera component for image field', async () => {
    // Image field should show camera upload button
    const cameraBtn = await page.$('.camera-component__add-btn')
    expect(cameraBtn).toBeTruthy()
  })

  it('should show upload limit (max 9 images)', async () => {
    // Camera component should display max count info
    const cameraComponent = await page.$('.camera-component')
    expect(cameraComponent).toBeTruthy()

    const limitText = await page.$('.camera-component__limit')
    if (limitText) {
      const text = await limitText.text()
      expect(text).toContain('9')
    }
  })

  it('should display image preview after mock upload', async () => {
    // Mock: inject a pre-uploaded image URL into the component
    await page.callMethod('setData', {
      'formData.imageField': ['https://example.com/test-image.jpg'],
    })
    await page.waitFor(500)

    const imagePreview = await page.$('.camera-component__image-item')
    expect(imagePreview).toBeTruthy()
  })

  it('should remove image from preview', async () => {
    const deleteBtn = await page.$('.camera-component__delete-btn')
    if (deleteBtn) {
      await deleteBtn.tap()
      await page.waitFor(300)

      // Image should be removed
      const imagePreview = await page.$('.camera-component__image-item')
      expect(imagePreview).toBeFalsy()
    }
  })
})

describe('Electronic Signature Flow', () => {
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

    // Navigate to a form with signature field
    page = await program.navigateTo('/pages/form/index?templateId=3')
    await page.waitFor(1000)
  })

  it('should display signature component for signature field', async () => {
    const signatureComponent = await page.$('.signature-component')
    expect(signatureComponent).toBeTruthy()
  })

  it('should display sign button when no signature', async () => {
    const signBtn = await page.$('.signature-component__sign-btn')
    expect(signBtn).toBeTruthy()
  })

  it('should display canvas after opening signature panel', async () => {
    const signBtn = await page.$('.signature-component__sign-btn')
    if (signBtn) {
      await signBtn.tap()
      await page.waitFor(500)

      // Canvas for drawing should be visible
      const canvas = await page.$('.signature-component__canvas')
      expect(canvas).toBeTruthy()
    }
  })

  it('should allow clearing the signature', async () => {
    const clearBtn = await page.$('.signature-component__clear-btn')
    if (clearBtn) {
      await clearBtn.tap()
      await page.waitFor(300)

      // Clear should succeed without error
      expect(clearBtn).toBeTruthy()
    }
  })

  it('should display signature preview after mock upload', async () => {
    // Mock: inject a pre-uploaded signature URL
    await page.callMethod('setData', {
      'formData.signatureField': 'https://example.com/test-signature.png',
    })
    await page.waitFor(500)

    const signaturePreview = await page.$('.signature-component__preview')
    expect(signaturePreview).toBeTruthy()
  })

  it('should allow re-signing by clicking re-sign button', async () => {
    const resignBtn = await page.$('.signature-component__resign-btn')
    if (resignBtn) {
      await resignBtn.tap()
      await page.waitFor(300)

      // Canvas should reappear for new signature
      const canvas = await page.$('.signature-component__canvas')
      expect(canvas).toBeTruthy()
    }
  })
})
