<template>
  <view
    v-if="visible"
    class="popup-mask"
    @click="close"
  >
    <view class="popup-content" @click.stop>
      <view class="popup-header">
        <text class="popup-title">{{ isEdit ? '编辑子分类' : '新增子分类' }}</text>
        <text class="popup-close" @click="close">×</text>
      </view>
      <view class="popup-body">
        <view class="readonly-row">
          <view class="readonly-item">
            <text class="readonly-label">所属大类</text>
            <view class="readonly-tag">
              <text class="readonly-tag-text">{{ groupName }}</text>
            </view>
          </view>
          <view class="readonly-item">
            <text class="readonly-label">收支类型</text>
            <view class="readonly-tag">
              <text class="readonly-tag-text">{{ groupTypeLabel }}</text>
            </view>
          </view>
        </view>

        <view class="form-divider"></view>

        <view class="form-item">
          <text class="form-label">选择图标</text>
          <scroll-view scroll-x class="icon-scroll" :show-scrollbar="false">
            <view class="icon-list">
              <view
                v-for="icon in icons"
                :key="icon.id"
                class="icon-item"
                :class="{ 'icon-item-active': formIconId === icon.id }"
                @click="formIconId = icon.id"
              >
                <text class="icon-emoji">{{ icon.url }}</text>
              </view>
            </view>
          </scroll-view>
        </view>

        <view class="form-item">
          <text class="form-label">分类名称</text>
          <input
            v-model="formName"
            class="form-input"
            type="text"
            placeholder="请输入分类名称"
            maxlength="6"
            @input="onNameInput"
          />
          <text class="char-count">{{ formName.length }}/6</text>
        </view>
      </view>

      <view class="popup-footer">
        <view class="footer-btn cancel-btn" @click="close">
          <text class="footer-btn-text">取消</text>
        </view>
        <view
          class="footer-btn confirm-btn"
          :class="{ 'footer-btn-disabled': !canSave }"
          @click="handleSave"
        >
          <text class="footer-btn-text">确定</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { categoryApi, type UserCategory, type UserIcon } from '../../../api/category'

const emit = defineEmits<{
  (e: 'saved'): void
}>()

const visible = ref(false)
const isEdit = ref(false)
const editCategoryId = ref<number>(0)
const editGroupId = ref<number>(0)
const groupName = ref('')
const groupType = ref<'income' | 'expense'>('expense')
const formName = ref('')
const formIconId = ref(0)
const icons = ref<UserIcon[]>([])
const saving = ref(false)

const groupTypeLabel = computed(() => {
  return groupType.value === 'income' ? '💰 收入' : '💸 支出'
})

const canSave = computed(() => {
  const name = formName.value.trim()
  return name.length > 0 && name.length <= 6 && !saving.value && formIconId.value > 0
})

function onNameInput() {
  // handled by maxlength and v-model
}

async function loadIcons() {
  try {
    const res = await categoryApi.getUserIcons()
    if (res.success && res.data.length > 0) {
      icons.value = res.data
      if (formIconId.value === 0) {
        formIconId.value = res.data[0].id
      }
    }
  } catch (err) {
    console.error('加载图标列表失败:', err)
  }
}

function openAdd(params: { groupId: number; groupName: string; groupType: 'income' | 'expense' }) {
  isEdit.value = false
  editCategoryId.value = 0
  editGroupId.value = params.groupId
  groupName.value = params.groupName
  groupType.value = params.groupType
  formName.value = ''
  formIconId.value = icons.value.length > 0 ? icons.value[0].id : 0
  visible.value = true
}

function openEdit(category: UserCategory, categoryGroupName?: string) {
  isEdit.value = true
  editCategoryId.value = category.id
  editGroupId.value = category.groupId
  groupName.value = categoryGroupName || ''
  groupType.value = category.type
  formName.value = category.name
  formIconId.value = category.iconId
  visible.value = true
}

function close() {
  visible.value = false
}

async function handleSave() {
  if (!canSave.value || saving.value) return

  saving.value = true
  const name = formName.value.trim()

  try {
    let res
    if (isEdit.value) {
      res = await categoryApi.updateCategory(editCategoryId.value, {
        name,
        iconId: formIconId.value
      })
    } else {
      res = await categoryApi.createCategory({
        name,
        groupId: editGroupId.value,
        iconId: formIconId.value,
        type: groupType.value
      })
    }

    if (res.success) {
      uni.showToast({ title: isEdit.value ? '编辑成功' : '新增成功', icon: 'success' })
      emit('saved')
      close()
    } else {
      uni.showToast({ title: res.message || '操作失败', icon: 'none' })
    }
  } catch (err) {
    console.error('保存子分类失败:', err)
    uni.showToast({ title: '网络错误', icon: 'none' })
  } finally {
    saving.value = false
  }
}

watch(visible, (val) => {
  if (val && icons.value.length === 0) {
    loadIcons()
  }
})

defineExpose({ openAdd, openEdit, close })
</script>

<style scoped>
.popup-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.popup-content {
  width: 100%;
  max-height: 80vh;
  background-color: #FFFFFF;
  border-radius: 32rpx 32rpx 0 0;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  border-bottom: 1rpx solid #F0F2F5;
}

.popup-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #333333;
}

.popup-close {
  font-size: 48rpx;
  color: #999999;
  line-height: 1;
}

.popup-body {
  flex: 1;
  overflow-y: auto;
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.readonly-row {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.readonly-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.readonly-label {
  font-size: 26rpx;
  color: #999999;
  flex-shrink: 0;
}

.readonly-tag {
  background-color: #F5F5F5;
  border-radius: 6rpx;
  padding: 4rpx 20rpx;
}

.readonly-tag-text {
  font-size: 28rpx;
  color: #666666;
}

.form-divider {
  height: 1rpx;
  background-color: #F0F2F5;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.form-label {
  font-size: 28rpx;
  color: #666666;
}

.form-input {
  height: 88rpx;
  padding: 0 24rpx;
  background-color: #F8F9FA;
  border-radius: 16rpx;
  font-size: 28rpx;
  color: #333333;
}

.char-count {
  font-size: 22rpx;
  color: #BBBBBB;
  text-align: right;
}

.icon-scroll {
  width: 100%;
  white-space: nowrap;
}

.icon-list {
  display: flex;
  gap: 16rpx;
  padding: 8rpx 0;
}

.icon-item {
  width: 96rpx;
  height: 96rpx;
  background-color: #F8F9FA;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 150ms ease;
  flex-shrink: 0;
}

.icon-item-active {
  background: linear-gradient(135deg, rgba(0, 191, 255, 0.15) 0%, rgba(0, 153, 204, 0.15) 100%);
  border: 2rpx solid #00BFFF;
}

.icon-emoji {
  font-size: 52rpx;
  line-height: 1;
}

.popup-footer {
  display: flex;
  gap: 16rpx;
  padding: 32rpx;
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #F0F2F5;
}

.footer-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 150ms ease;
}

.cancel-btn {
  background-color: #F0F2F5;
}

.confirm-btn {
  background: linear-gradient(135deg, #00BFFF 0%, #0099CC 100%);
}

.footer-btn-disabled {
  opacity: 0.5;
  pointer-events: none;
}

.footer-btn:active {
  opacity: 0.8;
  transform: scale(0.98);
}

.footer-btn-text {
  font-size: 30rpx;
  font-weight: 500;
  color: #666666;
}

.confirm-btn .footer-btn-text {
  color: #FFFFFF;
}
</style>