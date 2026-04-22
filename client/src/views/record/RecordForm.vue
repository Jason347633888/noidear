<template>
  <el-form
    ref="formRef"
    :model="formData"
    label-width="120px"
    class="record-form"
  >
    <template v-for="field in fields" :key="field.name">
      <!-- 文本字段 -->
      <el-form-item v-if="field.type === 'text'" :label="field.label" :prop="field.name">
        <el-input v-model="formData[field.name]" :placeholder="field.placeholder" />
      </el-form-item>

      <!-- 数字字段 -->
      <el-form-item v-else-if="field.type === 'number'" :label="field.label" :prop="field.name">
        <el-input-number v-model="formData[field.name]" :placeholder="field.placeholder" />
      </el-form-item>

      <!-- 选择字段 -->
      <el-form-item v-else-if="field.type === 'select'" :label="field.label" :prop="field.name">
        <el-select v-model="formData[field.name]" :placeholder="field.placeholder">
          <el-option
            v-for="opt in field.options"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </el-form-item>

      <!-- 日期字段 -->
      <el-form-item v-else-if="field.type === 'date'" :label="field.label" :prop="field.name">
        <el-date-picker
          v-model="formData[field.name]"
          type="date"
          :placeholder="field.placeholder"
          value-format="YYYY-MM-DD"
        />
      </el-form-item>

      <!-- 多行文本 -->
      <el-form-item v-else-if="field.type === 'textarea'" :label="field.label" :prop="field.name">
        <el-input
          v-model="formData[field.name]"
          type="textarea"
          :rows="3"
          :placeholder="field.placeholder"
        />
      </el-form-item>

      <!-- 图片上传字段 -->
      <el-form-item v-else-if="field.type === 'photo'" :label="field.label" :prop="field.name">
        <el-upload
          :action="`/api/v1/upload/image`"
          list-type="picture-card"
          :limit="3"
          accept="image/*"
          :on-success="(res: any) => { formData[field.name] = res.url }"
          :on-error="() => ElMessage.error('图片上传失败')"
          :headers="uploadHeaders"
        >
          <el-icon><Camera /></el-icon>
        </el-upload>
      </el-form-item>
    </template>
  </el-form>
</template>

<script setup lang="ts">
import { reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Camera } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

interface FieldOption {
  label: string
  value: string | number
}

interface FormField {
  name: string
  label: string
  type: 'text' | 'number' | 'select' | 'date' | 'textarea' | 'photo'
  placeholder?: string
  options?: FieldOption[]
}

const props = defineProps<{
  fields: FormField[]
  modelValue?: Record<string, unknown>
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, unknown>): void
}>()

const userStore = useUserStore()

const uploadHeaders = computed(() => ({
  Authorization: userStore.token ? `Bearer ${userStore.token}` : '',
}))

const formData = reactive<Record<string, unknown>>(
  props.modelValue ? { ...props.modelValue } : {}
)
</script>

<style scoped>
.record-form {
  width: 100%;
}
</style>
