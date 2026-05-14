<template>
  <WdPopup
    position="bottom"
    v-model="visible"
    :z-index="1001"
    :modal="true"
    :close-on-click-modal="true"
    custom-style="border-radius: 32rpx 32rpx 0 0; background: #fff;"
    @close="handleClose"
  >
    <view class="picker-header">
      <view class="picker-cancel" @tap="handleCancel">取消</view>
      <view class="picker-title">选择年月</view>
      <view class="picker-confirm" @tap="handleConfirm">确定</view>
    </view>
    <WdPickerView
      v-model="pickerValue"
      :columns="columns"
      custom-style="height: 420rpx"
    />
  </WdPopup>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const visible = ref(false)

const today = new Date()
const currentYearNum = today.getFullYear()
const currentMonthNum = today.getMonth() + 1

const years: number[] = []
for (let i = currentYearNum - 10; i <= currentYearNum; i++) {
  years.push(i)
}

const pickerValue = ref<number[]>([currentYearNum, currentMonthNum])

const columns = computed(() => {
  const selectedYear = pickerValue.value[0] || currentYearNum

  let months: number[]
  if (selectedYear === currentYearNum) {
    months = Array.from({ length: currentMonthNum }, (_, i) => i + 1)
  } else {
    months = Array.from({ length: 12 }, (_, i) => i + 1)
  }

  const yearColumn = years.map((y) => ({ value: y, label: `${y}年` }))
  const monthColumn = months.map((m) => ({ value: m, label: `${m.toString().padStart(2, '0')}月` }))

  return [yearColumn, monthColumn]
})

const parseYearMonth = (value: string) => {
  if (!value) return { year: currentYearNum, month: currentMonthNum }
  const parts = value.split('-')
  const year = parseInt(parts[0]) || currentYearNum
  const month = parseInt(parts[1]) || currentMonthNum
  return { year, month }
}

const initPickerValue = () => {
  const { year, month } = parseYearMonth(props.modelValue)
  pickerValue.value = [year, month]
}

const open = () => {
  initPickerValue()
  visible.value = true
}

const handleConfirm = () => {
  const year = pickerValue.value[0]
  const month = pickerValue.value[1]
  emit('update:modelValue', `${year}-${month.toString().padStart(2, '0')}`)
  visible.value = false
}

const handleCancel = () => {
  visible.value = false
}

const handleClose = () => {
  visible.value = false
}

watch(() => props.modelValue, () => {
  if (visible.value) {
    initPickerValue()
  }
})

defineExpose({ open })
</script>

<style scoped>
.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 32rpx;
  border-bottom: 1rpx solid rgba(229, 231, 235, 0.6);
  background: #fff;
}

.picker-cancel {
  font-size: 28rpx;
  color: #9ca3af;
  font-weight: 500;
  padding: 8rpx 16rpx;
  border-radius: 12rpx;
}

.picker-cancel:active {
  background: rgba(156, 163, 175, 0.1);
  color: #6b7280;
}

.picker-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2d3436;
}

.picker-confirm {
  font-size: 28rpx;
  color: #00BFFF;
  font-weight: 600;
  padding: 8rpx 20rpx;
  border-radius: 12rpx;
}

.picker-confirm:active {
  background: rgba(0, 191, 255, 0.15);
  transform: scale(0.95);
}
</style>