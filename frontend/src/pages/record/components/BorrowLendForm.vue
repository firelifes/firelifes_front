<template>
  <view class="borrow-lend-form">
    <!-- 借入/借出标识 -->
    <view class="type-header">
      <view class="type-icon-wrap" :class="isBorrow ? 'borrow' : 'lend'">
        <view class="category-icon-svg" :class="isBorrow ? 'category-icon-borrow' : 'category-icon-lend'"></view>
      </view>
      <view class="type-info">
        <text class="type-title">{{ isBorrow ? '新增借款' : '新增借出' }}</text>
        <text class="type-desc">{{ isBorrow ? '将创建一个贷款账户（liability）' : '将创建一个应收账款账户' }}</text>
      </view>
    </view>

    <!-- 贷款/借款名称 -->
    <view class="form-item">
      <text class="form-label">账户名称</text>
      <view class="input-wrap">
        <input
          class="form-input"
          v-model="accountName"
          :placeholder="isBorrow ? '例如：张三借款、房贷、车贷' : '例如：借给张三'"
          maxlength="20"
        />
      </view>
    </view>

    <!-- 对方名称（借入时为借款人，借出时为收款人） -->
    <view class="form-item">
      <text class="form-label">对方</text>
      <view class="input-wrap">
        <input
          class="form-input"
          v-model="counterparty"
          placeholder="请输入对方名称"
          maxlength="20"
        />
      </view>
    </view>

    <!-- 资金账户：借入时为到账账户 / 借出时为扣款账户 -->
    <view class="form-item">
      <text class="form-label">{{ isBorrow ? '到账账户' : '扣款账户' }}</text>
      <view class="picker-row" @tap="openAccountSelector">
        <view v-if="selectedAccount" class="picker-value-wrap">
          <view class="picker-icon category-icon-svg" :class="getAccountIconClass(selectedAccount.icon, selectedAccount.type)"></view>
          <text class="picker-value">{{ selectedAccount.name }}</text>
        </view>
        <text v-else class="picker-placeholder">请选择账户</text>
        <text class="picker-arrow">›</text>
      </view>
    </view>

    <!-- 贷款参数设置开关 -->
    <view class="form-item switch-item">
      <view class="switch-left">
        <text class="form-label">设置贷款参数</text>
        <text class="form-hint">利率、还款方式等（可选）</text>
      </view>
      <view class="switch-right">
        <view
          class="custom-switch"
          :class="{ active: showLoanParams }"
          @tap="showLoanParams = !showLoanParams"
        >
          <view class="switch-thumb"></view>
        </view>
      </view>
    </view>

    <!-- 贷款参数 -->
    <view v-if="showLoanParams" class="loan-params">
      <!-- 年利率 -->
      <view class="form-item">
        <text class="form-label">年利率</text>
        <view class="input-wrap with-suffix">
          <input
            class="form-input"
            v-model.number="annualInterestRateStr"
            type="digit"
            placeholder="0"
            @blur="onRateBlur"
          />
          <text class="input-suffix">%</text>
        </view>
        <text class="field-hint">无息借款可设为 0</text>
      </view>

      <!-- 还款方式 -->
      <view class="form-item">
        <text class="form-label">还款方式</text>
        <view class="option-grid">
          <view
            v-for="method in repaymentMethods"
            :key="method.value"
            class="option-item"
            :class="{ active: repaymentMethod === method.value }"
            @tap="repaymentMethod = method.value"
          >
            <text class="option-text">{{ method.label }}</text>
            <text class="option-desc">{{ method.desc }}</text>
          </view>
        </view>
      </view>

      <!-- 非灵活还款方式：总期数 + 还款日 -->
      <template v-if="repaymentMethod !== 'flexible'">
        <view class="form-item">
          <text class="form-label">总还款期数</text>
          <view class="input-wrap with-suffix">
            <input
              class="form-input"
              v-model.number="totalMonthsStr"
              type="number"
              placeholder="请输入"
              @blur="onTotalMonthsBlur"
            />
            <text class="input-suffix">期</text>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">每月还款日</text>
          <view class="day-grid">
            <view
              v-for="day in 31"
              :key="day"
              class="day-item"
              :class="{ active: repaymentDay === day }"
              @tap="repaymentDay = day"
            >
              <text class="day-text">{{ day }}</text>
            </view>
          </view>
        </view>
      </template>

      <view v-else class="flex-mode-hint">
        <text class="hint-text">灵活还款模式：无需固定期数和日期，随时手动还款</text>
      </view>
    </view>

    <!-- 账户选择弹框（作为 BorrowLendForm 内部子组件，与父 TransferForm 平级） -->
    <AccountSelectorPopup
      ref="accountSelectorRef"
      title="选择账户"
      :filterType="'transfer'"
      :filterRole="'from'"
      @select="onAccountSelect"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Account, RepaymentMethod } from '../../../types/account'
import { getAccountIconClass } from '../../../types/account'
import AccountSelectorPopup from './AccountSelectorPopup.vue'

const props = defineProps<{
  /** 'borrow' 借入 / 'lend' 借出 */
  type: 'borrow' | 'lend'
  /** 可选：预选中的账户 */
  initialAccount?: Account | null
  /** 可选：预填的对方名称 */
  initialCounterparty?: string
}>()

const emit = defineEmits<{
  /** 资金账户变更（借入时为到账账户，借出时为扣款账户） */
  (e: 'update:account', account: Account | null): void
  /** 对方名称变更 */
  (e: 'update:counterparty', value: string): void
  /** 表单数据完整变更 */
  (e: 'update:loanData', data: {
    accountName: string
    counterparty: string
    accountId: string | null
    annualInterestRate: number | undefined
    repaymentMethod: RepaymentMethod
    totalMonths: number | undefined
    remainingMonths: number | undefined
    repaymentDay: number | undefined
    hasLoanParams: boolean
  }): void
}>()

// ========== 基础状态 ==========
const isBorrow = computed(() => props.type === 'borrow')

const accountName = ref('')
const counterparty = ref(props.initialCounterparty || '')
const selectedAccount = ref<Account | null>(props.initialAccount || null)

const accountSelectorRef = ref<InstanceType<typeof AccountSelectorPopup> | null>(null)

// ========== 贷款参数 ==========
const showLoanParams = ref(false)
const annualInterestRateStr = ref('')
const totalMonthsStr = ref('')
const repaymentMethod = ref<RepaymentMethod>('flexible')
const repaymentDay = ref<number | undefined>(undefined)

const repaymentMethods: { value: RepaymentMethod; label: string; desc: string }[] = [
  { value: 'equal_principal_interest', label: '等额本息', desc: '月供固定' },
  { value: 'equal_principal', label: '等额本金', desc: '月供递减' },
  { value: 'interest_first', label: '先息后本', desc: '先还息后还本' },
  { value: 'flexible', label: '灵活还款', desc: '任意金额' },
]

// ========== 利率值处理 ==========
const annualInterestRate = computed<number | undefined>(() => {
  if (!showLoanParams.value) return undefined
  const v = parseFloat(annualInterestRateStr.value)
  return isNaN(v) ? 0 : v
})

// ========== 期数处理 ==========
const totalMonths = computed<number | undefined>(() => {
  if (!showLoanParams.value || repaymentMethod.value === 'flexible') return undefined
  const v = parseInt(totalMonthsStr.value)
  return isNaN(v) ? undefined : v
})

const remainingMonths = computed<number | undefined>(() => {
  return totalMonths.value
})

// ========== 账户名称自动填充 ==========
watch(counterparty, (val) => {
  // 如果用户还没手动填过账户名称，根据对方名称自动生成
  if (val && !accountName.value) {
    accountName.value = isBorrow.value ? `${val}借款` : `借给${val}`
  }
  emitData()
}, { immediate: false })

watch(selectedAccount, (val) => {
  emit('update:account', val)
  emitData()
})

watch([accountName, showLoanParams, annualInterestRateStr, totalMonthsStr, repaymentMethod, repaymentDay], () => {
  emitData()
})

// ========== 事件处理 ==========
const openAccountSelector = () => {
  accountSelectorRef.value?.open(selectedAccount.value?.id)
}

const onAccountSelect = (account: Account) => {
  selectedAccount.value = account
}

const onRateBlur = () => {
  if (annualInterestRateStr.value === '') return
  const v = parseFloat(annualInterestRateStr.value)
  if (!isNaN(v)) {
    annualInterestRateStr.value = v.toString()
  }
}

const onTotalMonthsBlur = () => {
  if (totalMonthsStr.value === '') return
  const v = parseInt(totalMonthsStr.value)
  if (!isNaN(v)) {
    totalMonthsStr.value = v.toString()
  }
}

// ========== 聚合数据 emit ==========
const emitData = () => {
  emit('update:loanData', {
    accountName: accountName.value,
    counterparty: counterparty.value,
    accountId: selectedAccount.value?.id || null,
    annualInterestRate: annualInterestRate.value,
    repaymentMethod: repaymentMethod.value,
    totalMonths: totalMonths.value,
    remainingMonths: remainingMonths.value,
    repaymentDay: showLoanParams.value && repaymentMethod.value !== 'flexible' ? repaymentDay.value : undefined,
    hasLoanParams: showLoanParams.value,
  })
}

// 初始 emit 一次
emitData()
</script>

<style scoped>
.borrow-lend-form {
  padding: 20rpx 0;
}

.type-header {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 12rpx 24rpx 28rpx;
  margin-bottom: 8rpx;
}

.type-icon-wrap {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.type-icon-wrap.borrow {
  background: rgba(250, 53, 52, 0.1);
  color: #FA3534;
}

.type-icon-wrap.lend {
  background: rgba(13, 148, 136, 0.1);
  color: #0D9488;
}

.type-icon-wrap .category-icon-svg {
  width: 40rpx;
  height: 40rpx;
}

.type-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.type-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1E293B;
}

.type-desc {
  font-size: 24rpx;
  color: #94A3B8;
}

.form-item {
  margin-bottom: 28rpx;
  padding: 0 24rpx;
}

.form-item:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  color: #1E293B;
  margin-bottom: 12rpx;
}

.form-hint {
  display: block;
  font-size: 22rpx;
  color: #94A3B8;
  font-weight: 400;
  margin-top: 4rpx;
}

.field-hint {
  display: block;
  font-size: 22rpx;
  color: #94A3B8;
  margin-top: 8rpx;
}

.input-wrap {
  background: #F1F5F9;
  border-radius: 16rpx;
  padding: 0 24rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
}

.input-wrap.with-suffix {
  justify-content: space-between;
}

.form-input {
  flex: 1;
  height: 88rpx;
  font-size: 28rpx;
  color: #1E293B;
}

.input-suffix {
  font-size: 26rpx;
  color: #94A3B8;
  font-weight: 500;
  margin-left: 8rpx;
}

/* 账户选择行 */
.picker-row {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  background: #F1F5F9;
  border-radius: 16rpx;
  min-height: 48rpx;
}

.picker-value-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.picker-icon {
  width: 40rpx;
  height: 40rpx;
  flex-shrink: 0;
}

.picker-value {
  font-size: 28rpx;
  color: #1E293B;
  font-weight: 500;
}

.picker-placeholder {
  flex: 1;
  font-size: 28rpx;
  color: #CBD5E1;
}

.picker-arrow {
  font-size: 36rpx;
  color: #CBD5E1;
  font-weight: 300;
}

/* 自定义 switch */
.switch-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.switch-left {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.switch-left .form-label {
  margin-bottom: 4rpx;
}

.switch-right {
  flex-shrink: 0;
}

.custom-switch {
  width: 92rpx;
  height: 52rpx;
  border-radius: 26rpx;
  background: #E2E8F0;
  position: relative;
  transition: background 0.2s ease;
}

.custom-switch.active {
  background: #0D9488;
}

.switch-thumb {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background: #FFFFFF;
  position: absolute;
  top: 4rpx;
  left: 4rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.15);
  transition: left 0.2s ease;
}

.custom-switch.active .switch-thumb {
  left: 44rpx;
}

/* 贷款参数区域 */
.loan-params {
  margin-top: 16rpx;
  padding-top: 20rpx;
  border-top: 2rpx dashed #E2E8F0;
}

/* 还款方式 */
.option-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}

.option-item {
  padding: 20rpx 16rpx;
  background: #FFFFFF;
  border: 2rpx solid #E2E8F0;
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  transition: all 0.2s ease;
}

.option-item:active {
  transform: scale(0.97);
}

.option-item.active {
  border-color: #0D9488;
  background: rgba(13, 148, 136, 0.05);
}

.option-text {
  font-size: 26rpx;
  color: #475569;
  font-weight: 500;
}

.option-item.active .option-text {
  color: #0D9488;
}

.option-desc {
  font-size: 22rpx;
  color: #94A3B8;
}

.option-item.active .option-desc {
  color: rgba(13, 148, 136, 0.7);
}

/* 还款日 */
.day-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.day-item {
  width: 68rpx;
  height: 68rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FFFFFF;
  border: 2rpx solid #E2E8F0;
  border-radius: 12rpx;
  transition: all 0.2s ease;
}

.day-item:active {
  transform: scale(0.95);
}

.day-item.active {
  border-color: #0D9488;
  background: rgba(13, 148, 136, 0.08);
}

.day-text {
  font-size: 26rpx;
  color: #475569;
  font-weight: 500;
}

.day-item.active .day-text {
  color: #0D9488;
}

/* 灵活还款提示 */
.flex-mode-hint {
  padding: 20rpx 24rpx;
  background: rgba(13, 148, 136, 0.06);
  border-radius: 16rpx;
}

.hint-text {
  font-size: 24rpx;
  color: #0D9488;
  line-height: 1.5;
}
</style>
