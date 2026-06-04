<template>
  <WdPopup
    position="bottom"
    v-model="visible"
    :z-index="2000"
    :modal="true"
    :close-on-click-modal="true"
    custom-style="border-radius: 32rpx 32rpx 0 0; background: var(--color-bg-card, #FFFFFF); max-height: 70vh; display: flex; flex-direction: column;"
    @close="handleClose"
  >
    <view class="popup-header">
      <text class="popup-title">选择利息分类</text>
      <text class="popup-close" @tap="handleClose">×</text>
    </view>
    <scroll-view class="category-list" scroll-y>
      <view
        v-for="group in categoryGroups"
        :key="group.id"
        class="group-section"
      >
        <view class="group-header">
          <text class="group-name">{{ group.name }}</text>
        </view>
        <view class="category-grid">
          <view
            v-for="category in group.children"
            :key="category.id"
            class="category-item"
            :class="{ selected: selectedCategoryId === category.id }"
            @tap="handleSelectCategory(category)"
          >
            <view class="category-icon">
              <view class="category-icon-svg" :class="getIconClass(category.name)"></view>
            </view>
            <text class="category-name">{{ category.name }}</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </WdPopup>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { categoryApi, type CategoryGroup, type CategoryItem } from '../../../api/category'
import { getCategoryIconClass } from '../../../utils/category-icon-map'

const emit = defineEmits<{
  (e: 'select', category: CategoryItem): void
  (e: 'open'): void
  (e: 'close'): void
}>()

const categoryGroups = ref<CategoryGroup[]>([])
const visible = ref(false)
const selectedCategoryId = ref<number>(0)

const open = async (selectedId?: number) => {
  visible.value = true
  emit('open')
  await loadCategories()
  if (selectedId) {
    selectedCategoryId.value = selectedId
  }
}

const close = () => {
  handleClose()
}

const loadCategories = async () => {
  try {
    const res = await categoryApi.getUserCategories('expense')
    if (res.success && res.data) {
      categoryGroups.value = res.data
    }
  } catch (error) {
    console.error('加载分类失败:', error)
  }
}

const getIconClass = (name: string): string => {
  return getCategoryIconClass(name)
}

const handleSelectCategory = (category: CategoryItem) => {
  selectedCategoryId.value = category.id
  emit('select', category)
  visible.value = false
  // 选中后也要通知父组件关闭弹框，以便恢复键盘
  emit('close')
}

const handleClose = () => {
  visible.value = false
  // 关键修复：必须 emit close，否则父组件的 interestCategoryPopupVisible 不会复位
  // 导致 TransferForm 中 v-if="!interestCategoryPopupVisible" 的键盘永远不显示
  emit('close')
}

defineExpose({ open, close })
</script>

<style scoped>
.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28rpx 32rpx 20rpx;
  border-bottom: 1rpx solid var(--color-border, #E2E8F0);
  background: var(--color-bg-card, #FFFFFF);
  flex-shrink: 0;
}

.popup-title {
  font-size: var(--text-title);
  font-weight: 600;
  color: var(--color-text-primary, #1E293B);
}

.popup-close {
  font-size: var(--text-number);
  color: var(--color-text-secondary, #94A3B8);
  padding: 4rpx 12rpx;
}

.category-list {
  /* 在 flex column 容器下，flex:1 让 scroll-view 撑满剩余空间，
     配合 WdPopup 的 max-height: 70vh 形成确定高度，scroll-view 才能滚动 */
  flex: 1;
  padding: 20rpx 24rpx 40rpx;
  /* 兜底：部分端 scroll-view 不识别 flex:1 时使用 overflow-y 也能滚动 */
  overflow-y: auto;
}

.group-section {
  margin-bottom: 24rpx;
}

.group-header {
  padding: 8rpx 0 16rpx;
}

.group-name {
  font-size: var(--text-body);
  color: var(--color-text-primary, #1E293B);
  font-weight: 600;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24rpx 16rpx;
}

.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8rpx 0;
  transition: all 0.2s ease;
}

.category-item:active {
  transform: scale(0.92);
}

.category-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: var(--color-bg-card, #FFFFFF);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
  border: 2rpx solid transparent;
  transition: all 0.2s ease;
  color: var(--color-text-secondary, #94A3B8);
}

.category-item.selected .category-icon {
  background: var(--color-primary-light, #E6F7F5);
  border-color: var(--color-primary, #0D9488);
  box-shadow: 0 4rpx 16rpx rgba(13, 148, 136, 0.15);
  color: var(--color-primary, #0D9488);
}

.category-icon-svg {
  width: 40rpx;
  height: 40rpx;
}

.category-name {
  font-size: var(--text-small);
  color: var(--color-text-primary, #1E293B);
  text-align: center;
}

.category-item.selected .category-name {
  color: var(--color-primary, #0D9488);
  font-weight: 600;
}
</style>
