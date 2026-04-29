<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'

onLaunch(() => {
  console.log('现场终端启动')
})

onShow(() => {
  console.log('现场终端显示')
})

onHide(() => {
  console.log('现场终端隐藏')
})
</script>

<style>
page {
  background-color: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
    'Helvetica Neue', Arial, sans-serif;
  font-size: 14px;
  color: #333;
}

.container {
  padding: 20rpx;
}

.page-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400rpx;
}
</style>
