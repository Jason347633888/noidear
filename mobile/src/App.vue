<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'
import { useOfflineStore } from '@/stores/offline'

onLaunch(() => {
  const userStore = useUserStore()
  userStore.initFromStorage()

  const offlineStore = useOfflineStore()
  offlineStore.initNetworkListener()
})

onShow(() => {
  const offlineStore = useOfflineStore()
  offlineStore.checkNetworkAndSync()
})

onHide(() => {
  // App hidden
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
