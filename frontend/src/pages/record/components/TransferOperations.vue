<template>
  <view class="transfer-operations">
    <view class="category-grid">
      <view
        v-for="operation in operations"
        :key="operation.type"
        class="category-item"
        :class="{ selected: selectedOperation === operation.type }"
        @tap="handleOperation(operation.type)"
      >
        <view class="category-icon">
          <view class="category-icon-svg" :class="operation.iconClass"></view>
        </view>
        <text class="category-name">{{ operation.name }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  (e: 'select', operation: TransferOperationType): void
}>()

type TransferOperationType = 'transfer' | 'repay-credit' | 'repay-loan' | 'lend' | 'borrow'

const selectedOperation = ref<TransferOperationType | null>(null)

const operations = [
  { type: 'transfer' as TransferOperationType, name: '转账', iconClass: 'category-icon-transfer' },
  { type: 'repay-credit' as TransferOperationType, name: '还信用卡', iconClass: 'category-icon-repay-credit' },
  { type: 'repay-loan' as TransferOperationType, name: '还贷款', iconClass: 'category-icon-repay-loan' },
  { type: 'lend' as TransferOperationType, name: '借出', iconClass: 'category-icon-lend' },
  { type: 'borrow' as TransferOperationType, name: '借入', iconClass: 'category-icon-borrow' },
]

const handleOperation = (operation: TransferOperationType) => {
  selectedOperation.value = operation
  emit('select', operation)
}
</script>

<style scoped>
.transfer-operations {
  padding: 20rpx;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 30rpx 20rpx;
}

.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10rpx;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.category-item:active {
  transform: scale(0.95);
}

.category-icon {
  width: 88rpx;
  height: 88rpx;
  background: var(--color-bg-card, #FFFFFF);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
  color: var(--color-primary, #0D9488);
}

.category-item.selected .category-icon {
  background: linear-gradient(135deg, var(--color-primary, #0D9488) 0%, var(--color-primary-dark, #0B7A70) 100%);
  box-shadow: 0 4rpx 16rpx rgba(13, 148, 136, 0.3);
  color: var(--color-text-inverse, #FFFFFF);
}

.category-icon-svg {
  width: 44rpx;
  height: 44rpx;
}

.category-name {
  font-size: var(--text-small);
  color: var(--color-text-primary, #1E293B);
  text-align: center;
}
</style>
