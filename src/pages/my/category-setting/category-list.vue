<template>
  <view class="page-container">
    <wd-navbar
      :title="groupName"
      left-arrow
      fixed
      placeholder
      bordered
      safe-area-inset-top
      right-text="+"
      @click-right="handleAdd"
      @click-left="goBack"
    />

    <view class="content-scroll">
      <view v-if="loading" class="loading-state">
        <text class="loading-icon">⏳</text>
        <text class="loading-text">加载中...</text>
      </view>

      <view v-else-if="!hasCategories" class="empty-state">
        <text class="empty-icon">📂</text>
        <text class="empty-text">添加你的第一个子分类</text>
      </view>

      <view v-else class="category-list">
        <view
          v-for="(category, index) in sortedCategories"
          :key="category.id"
          class="group-row"
          :class="{ 'row-dragging': draggingIndex === index }"
        >
          <view
            class="drag-handle"
            @touchstart="onDragStart($event, index)"
            @touchmove="onDragMove($event)"
            @touchend="onDragEnd"
          >
            <text class="drag-icon">☰</text>
          </view>
          <view class="swipe-wrapper">
            <wd-swipe-action
              :right-width="140"
            >
              <template #default>
                <view
                  class="category-card"
                  :class="{ 'card-disabled': !category.isEnabled }"
                >
                  <view class="card-icon-wrapper">
                    <text class="card-icon">{{ getIconUrl(category) }}</text>
                  </view>
                  <view class="card-info">
                    <view class="card-title-row">
                      <text class="card-title">{{ category.name }}</text>
                      <view v-if="!category.isUserCreated" class="default-badge">
                        <text class="badge-text">默认</text>
                      </view>
                    </view>
                    <text v-if="!category.isEnabled" class="disabled-label">已禁用</text>
                  </view>
                </view>
              </template>

              <template #right>
                <view class="swipe-actions">
                  <view
                    class="swipe-btn swipe-btn-edit"
                    @click.stop="handleEdit(category)"
                  >
                    <text class="swipe-btn-text">编辑</text>
                  </view>
                  <view
                    v-if="category.isUserCreated"
                    class="swipe-btn swipe-btn-delete"
                    @click.stop="handleDelete(category)"
                  >
                    <text class="swipe-btn-text">删除</text>
                  </view>
                  <view
                    v-else
                    class="swipe-btn swipe-btn-toggle"
                    @click.stop="handleToggle(category)"
                  >
                    <text class="swipe-btn-text">{{ category.isEnabled ? '禁用' : '启用' }}</text>
                  </view>
                </view>
              </template>
            </wd-swipe-action>
          </view>
        </view>
      </view>

      <view class="safe-bottom"></view>
    </view>

    <category-edit-popup ref="editPopupRef" @saved="loadCategories" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { categoryApi, type UserCategory } from '../../../api/category'
import { navigateBack } from '../../../utils/navigate'
import CategoryEditPopup from './category-edit.vue'

const groupId = ref(0)
const groupName = ref('')
const groupType = ref<'income' | 'expense'>('expense')
const loading = ref(false)
const categories = ref<UserCategory[]>([])

const draggingIndex = ref(-1)
const dragStartY = ref(0)
const dragOffsetY = ref(0)
const itemHeightPx = ref(80)

const editPopupRef = ref<InstanceType<typeof CategoryEditPopup> | null>(null)

const hasCategories = computed(() => categories.value.length > 0)

const sortedCategories = computed(() => {
  const list = [...categories.value]
  const enabled = list.filter(c => c.isEnabled).sort((a, b) => a.sortOrder - b.sortOrder)
  const disabled = list.filter(c => !c.isEnabled).sort((a, b) => a.sortOrder - b.sortOrder)
  return [...enabled, ...disabled]
})

function getIconUrl(category: UserCategory) {
  return category.icon?.url || '📦'
}

async function loadCategories() {
  loading.value = true
  try {
    const res = await categoryApi.getCategoriesByGroup(groupId.value)
    if (res.success) {
      categories.value = res.data
    } else {
      uni.showToast({
        title: res.message || '获取分类列表失败',
        icon: 'none'
      })
    }
  } catch (err) {
    console.error('加载分类列表失败:', err)
    uni.showToast({
      title: '网络错误',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}

function goBack() {
  navigateBack('/pages/my/category-setting/category-group-list')
}

function handleAdd() {
  editPopupRef.value?.openAdd({
    groupId: groupId.value,
    groupName: groupName.value,
    groupType: groupType.value
  })
}

function handleEdit(category: UserCategory) {
  editPopupRef.value?.openEdit(category, groupName.value)
}

async function handleToggle(category: UserCategory) {
  try {
    const res = await categoryApi.toggleCategory(category.id)
    if (res.success) {
      uni.showToast({
        title: res.data.isEnabled ? '已启用' : '已禁用',
        icon: 'success'
      })
      loadCategories()
    } else {
      uni.showToast({ title: res.message || '操作失败', icon: 'none' })
    }
  } catch (err) {
    console.error('操作失败:', err)
    uni.showToast({ title: '网络错误', icon: 'none' })
  }
}

async function handleDelete(category: UserCategory) {
  uni.showModal({
    title: '提示',
    content: '确定要删除此分类吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          const apiRes = await categoryApi.deleteCategory(category.id)
          if (apiRes.success) {
            uni.showToast({ title: '删除成功', icon: 'success' })
            loadCategories()
          } else {
            uni.showToast({ title: apiRes.message || '删除失败', icon: 'none' })
          }
        } catch (err) {
          uni.showToast({ title: '网络错误', icon: 'none' })
        }
      }
    }
  })
}

function onDragStart(e: any, index: number) {
  const realIndex = sortedCategories.value.indexOf(categories.value[index])
  draggingIndex.value = realIndex
  const touch = e.touches ? e.touches[0] : e
  dragStartY.value = touch.clientY
  dragOffsetY.value = 0
}

function onDragMove(e: any) {
  if (draggingIndex.value === -1) return
  const touch = e.touches ? e.touches[0] : e
  const deltaY = touch.clientY - dragStartY.value
  dragOffsetY.value = deltaY

  const moveSteps = Math.round(deltaY / itemHeightPx.value)
  if (moveSteps === 0) return

  const fromIndex = draggingIndex.value
  const toIndex = Math.max(0, Math.min(categories.value.length - 1, fromIndex + moveSteps))

  const fromItem = categories.value[fromIndex]
  const toItem = categories.value[toIndex]
  if (!fromItem.isEnabled || !toItem.isEnabled) return
  if (fromIndex === toIndex) return

  const items = [...categories.value]
  const [removed] = items.splice(fromIndex, 1)
  items.splice(toIndex, 0, removed)
  categories.value = items
  draggingIndex.value = toIndex
  dragStartY.value = touch.clientY
  dragOffsetY.value = 0
}

function onDragEnd() {
  if (draggingIndex.value === -1) return
  const orderedIds = categories.value.map(c => c.id)
  draggingIndex.value = -1
  dragOffsetY.value = 0
  categoryApi.reorderCategories(groupId.value, orderedIds).catch(() => {
    loadCategories()
  })
}

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const options = (currentPage.$page?.options || currentPage.options || {}) as Record<string, string>

  if (options.groupId) {
    groupId.value = parseInt(options.groupId)
  }
  if (options.groupName) {
    groupName.value = decodeURIComponent(options.groupName)
  }
  if (options.groupType) {
    groupType.value = options.groupType as 'income' | 'expense'
  }

  loadCategories()
})

onShow(() => {
  if (groupId.value > 0) {
    loadCategories()
  }
})
</script>

<style scoped>
.page-container {
  overflow-x: hidden;
  min-height: 100vh;
  background-color: #F5F5F5;
}

.content-scroll {
  padding: 24rpx;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 160rpx 0;
}

.loading-icon,
.empty-icon {
  font-size: 120rpx;
  margin-bottom: 24rpx;
  opacity: 0.4;
}

.loading-text,
.empty-text {
  font-size: 28rpx;
  color: #999999;
  text-align: center;
  line-height: 1.6;
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.group-row {
  display: flex;
  align-items: center;
  transition: transform 0.2s ease;
}

.swipe-wrapper {
  flex: 1;
  overflow: hidden;
}

.group-row .drag-handle {
  width: 48rpx;
  height: 120rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: -8rpx;
  z-index: 5;
}

.drag-icon {
  font-size: 32rpx;
  color: #CCCCCC;
  line-height: 1;
}

.group-row:active .drag-icon,
.group-row.row-dragging .drag-icon {
  color: #00BFFF;
}

.row-dragging {
  opacity: 0.85;
  transform: scale(1.02);
  z-index: 10;
}

.category-card {
  height: 120rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 0 32rpx;
  background-color: #FFFFFF;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.04);
}

.category-card:active {
  background-color: #F8F9FA;
}

.card-disabled {
  opacity: 0.6;
}

.card-icon-wrapper {
  width: 88rpx;
  height: 88rpx;
  background: linear-gradient(135deg, rgba(0, 191, 255, 0.1) 0%, rgba(0, 153, 204, 0.1) 100%);
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.card-icon {
  font-size: 48rpx;
  line-height: 1;
}

.card-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-wrap: wrap;
}

.card-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333333;
}

.default-badge {
  background: linear-gradient(135deg, #00BFFF 0%, #0099CC 100%);
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
}

.badge-text {
  font-size: 20rpx;
  color: #FFFFFF;
  font-weight: 500;
}

.disabled-label {
  font-size: 24rpx;
  color: #FAAD14;
}

.swipe-actions {
  display: flex;
  height: 100%;
}

.swipe-btn {
  width: 70rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.swipe-btn-edit {
  background-color: #00BFFF;
}

.swipe-btn-delete {
  background-color: #FA3534;
}

.swipe-btn-toggle {
  background-color: #FAAD14;
}

.swipe-btn-text {
  font-size: 26rpx;
  color: #FFFFFF;
  font-weight: 500;
}

.safe-bottom {
  height: calc(env(safe-area-inset-bottom) + 40rpx);
}
</style>