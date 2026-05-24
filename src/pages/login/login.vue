<template>
  <view class="login-container">
    <view class="logo-area">
      <image class="logo" src="/static/logo.png" mode="aspectFit" />
      <text class="app-name">Fire生活家</text>
    </view>

    <view class="tab-area">
      <view class="tab-item" :class="{ active: loginType === 'password' }" @click="loginType = 'password'">
        密码登录
      </view>
      <view class="tab-item" :class="{ active: loginType === 'code' }" @click="loginType = 'code'">
        验证码登录
      </view>
    </view>

    <view class="form-area">
      <view class="input-item">
        <input class="input" v-model="phone" type="number" placeholder="请输入手机号" maxlength="11" />
      </view>

      <view class="input-item" v-if="loginType === 'password'">
        <input class="input" v-model="password" :type="showPassword ? 'text' : 'password'" placeholder="请输入密码" />
        <view class="toggle-pwd" @click="showPassword = !showPassword">
          {{ showPassword ? '隐藏' : '显示' }}
        </view>
      </view>

      <view class="input-item" v-else>
        <input class="input" v-model="code" type="number" placeholder="请输入验证码" maxlength="6" />
        <view class="send-code-btn" :class="{ disabled: isCounting }" @click="sendCode">
          {{ isCounting ? `${count}s` : '获取验证码' }}
        </view>
      </view>

      <view class="agreement">
        <checkbox-group @change="toggleAgreement">
          <label class="checkbox-label">
            <checkbox :checked="agreed" color="#00BFFF" />
            <text>我已阅读并同意</text>
            <text class="link" @click.stop="openAgreement('user')">《用户协议》</text>
            <text>和</text>
            <text class="link" @click.stop="openAgreement('privacy')">《隐私政策》</text>
          </label>
        </checkbox-group>
      </view>

      <view class="login-btn" :class="{ disabled: !canLogin || loading }" @click="handleLogin">
        {{ loading ? '登录中...' : '登录' }}
      </view>

      <view class="wechat-login-btn" @click="handleWechatLogin">
        <text>微信一键登录</text>
      </view>

      <view class="links">
        <text class="link" @click="goToRegister">注册账号</text>
        <text class="divider">|</text>
        <text class="link">忘记密码</text>
      </view>
    </view>
  </view>

  <view v-if="showAgreementPopup" class="popup-overlay" @touchmove.stop.prevent @click="closeAgreement">
    <view class="popup-sheet" @click.stop>
      <view class="popup-header">
        <text class="popup-title">{{ agreementTitle }}</text>
      </view>
      <view class="popup-divider"></view>
      <scroll-view class="popup-content" scroll-y :style="{ height: contentHeight + 'px' }">
        <text class="popup-text">{{ currentAgreementContent }}</text>
      </scroll-view>
      <view class="popup-close" @click.stop="closeAgreement">
        <text class="close-text">关闭</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useUserStore } from '../../stores/user'
import { validatePhone, validatePassword, validateCode } from '../../utils/validate'
import { useCountdown } from '../../utils/countdown'
import { sendSmsCode, login } from '../../api/auth'

const userStore = useUserStore()
const loginType = ref<'password' | 'code'>('password')
const phone = ref('')
const password = ref('')
const code = ref('')
const showPassword = ref(false)
const agreed = ref(false)
const loading = ref(false)
const showAgreementPopup = ref(false)
const agreementType = ref<'user' | 'privacy'>('user')
const contentHeight = ref(400)

const { count, isCounting, start } = useCountdown()

const canLogin = computed(() => {
  if (!agreed.value) return false
  if (!validatePhone(phone.value)) return false
  if (loginType.value === 'password') {
    return validatePassword(password.value)
  } else {
    return validateCode(code.value)
  }
})

const toggleAgreement = (e: any) => {
  agreed.value = e.detail.value.length > 0
}

const userAgreementContent = `欢迎使用本应用！

请您仔细阅读以下条款。在使用本应用之前，请您务必审慎阅读、充分理解本协议各条款内容。

一、总则

1.1 本协议是您与本应用之间关于使用本应用服务所订立的协议。

1.2 您在使用本应用服务时，应当遵守中华人民共和国相关法律法规。本协议可由本应用随时更新，更新后的协议条款一旦公布即代替原来的协议条款，恕不再另行通知。

二、账号注册与使用

2.1 您在注册时应提供真实、准确、完整的个人信息，并在信息变更时及时更新。您不得以虚假、冒用的身份信息进行注册。

2.2 您应对您的账号安全负责，妥善保管账号密码。因您保管不善导致的账号被盗用或损失，由您自行承担。

2.3 每个手机号仅限注册一个账号。

三、用户行为规范

3.1 禁止发布违法信息，禁止侵犯他人合法权益的行为。

3.2 您在使用过程中不得从事以下行为：
（1）发布、传送、传播违法违规信息；
（2）利用本应用从事欺诈、传销等非法活动；
（3）干扰本应用的正常运营，破坏应用功能和数据。

四、免责声明

4.1 本应用按"现状"和"可得到"的状态向您提供服务，对服务的及时性、安全性不作任何明示或暗示的保证。

4.2 因不可抗力、计算机病毒或黑客攻击等造成的服务中断，本应用不承担任何责任。

五、其他

5.1 本协议的解释、效力及纠纷的解决，适用于中华人民共和国法律。

5.2 若本协议的任何条款被认定为无效，不影响其他条款的效力。`

const privacyPolicyContent = `本应用尊重并保护所有使用服务用户的个人隐私权。

一、信息收集

1.1 我们收集您的个人信息包括：
- 手机号码：用于账号注册和身份验证；
- 昵称和头像：用于展示您的个人资料；
- 设备信息：用于优化服务体验和安全防护。

1.2 我们会在您使用特定功能时获取相应的权限，包括但不限于：相机、相册、存储等。

二、信息使用

2.1 我们收集的信息将用于：
- 为您提供、维护和改进我们的服务；
- 向您发送服务通知；
- 保障账号安全和防范风险。

2.2 我们不会主动将您的个人信息提供给第三方，除非：
- 获得您的明确授权；
- 法律法规要求；
- 为保护我们或公众的人身财产安全。

三、信息存储与保护

3.1 您的个人信息存储在中国境内，我们采用加密技术保护您的数据安全。

3.2 我们采取合理的技术措施和管理制度保护您的信息安全，防止信息泄露、损毁或丢失。

四、您的权利

4.1 您有权访问、更正、删除您的个人信息。

4.2 您可以通过注销账号来永久删除您的所有数据。

五、隐私政策更新

5.1 我们可能会适时修订本隐私政策，修订后的内容会通过应用内通知或公告方式告知您。

5.2 如您对本隐私政策有任何疑问，可通过应用内反馈渠道联系我们。`

const agreementTitle = computed(() => {
  return agreementType.value === 'user' ? '用户协议' : '隐私政策'
})

const currentAgreementContent = computed(() => {
  return agreementType.value === 'user' ? userAgreementContent : privacyPolicyContent
})

const openAgreement = (type: 'user' | 'privacy') => {
  agreementType.value = type
  showAgreementPopup.value = true
  nextTick(() => {
    const info = uni.getSystemInfoSync()
    const rpxRatio = info.windowWidth / 750
    const headerPx = 104 * rpxRatio
    const closePx = 104 * rpxRatio
    const dividerPx = 1
    const maxSheetPx = info.windowHeight * 0.7
    contentHeight.value = Math.floor(maxSheetPx - headerPx - dividerPx - closePx)
  })
}

const closeAgreement = () => {
  showAgreementPopup.value = false
}

const sendCode = async () => {
  if (!validatePhone(phone.value)) {
    uni.showToast({
      title: '请输入正确的手机号',
      icon: 'none'
    })
    return
  }
  if (isCounting.value) return
  
  try {
    await sendSmsCode(phone.value, 'login')
    uni.showToast({
      title: '验证码已发送',
      icon: 'success'
    })
    start()
  } catch (err) {
    console.error(err)
  }
}

const handleLogin = async () => {
  if (!canLogin.value || loading.value) return
  
  loading.value = true
  try {
    let data
    if (loginType.value === 'password') {
      data = { phone: phone.value, password: password.value }
    } else {
      data = { phone: phone.value, code: code.value }
    }
    
    const res = await login(data)
    console.log('[login] 登录响应', res)
    
    userStore.setAuth(res.data.token, res.data.user)
    console.log('[login] token已保存', res.data.token.substring(0, 20) + '...')
    
    uni.showToast({
      title: '登录成功',
      icon: 'success'
    })
    setTimeout(() => {
      uni.reLaunch({
        url: '/pages/detail/index'
      })
    }, 1000)
  } catch (err) {
    console.error('[login] 登录失败', err)
  } finally {
    loading.value = false
  }
}

const handleWechatLogin = () => {
  uni.showToast({
    title: '微信登录功能开发中',
    icon: 'none'
  })
}

const goToRegister = () => {
  uni.navigateTo({
    url: '/pages/login/register'
  })
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 80rpx 60rpx;
}

.logo-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 80rpx;
}

.logo {
  width: 160rpx;
  height: 160rpx;
  border-radius: 32rpx;
  margin-bottom: 24rpx;
}

.app-name {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.tab-area {
  display: flex;
  margin-bottom: 60rpx;
  border-bottom: 1px solid #e5e5e5;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  font-size: 30rpx;
  color: #666;
  position: relative;
}

.tab-item.active {
  color: #00BFFF;
  font-weight: bold;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60rpx;
  height: 4rpx;
  background: #00BFFF;
  border-radius: 2rpx;
}

.form-area {
  background: white;
  border-radius: 24rpx;
  padding: 40rpx;
}

.input-item {
  display: flex;
  align-items: center;
  border-bottom: 1px solid #e5e5e5;
  padding: 24rpx 0;
  position: relative;
}

.input {
  flex: 1;
  font-size: 30rpx;
}

.toggle-pwd {
  font-size: 26rpx;
  color: #999;
  padding: 8rpx;
}

.send-code-btn {
  font-size: 26rpx;
  color: #00BFFF;
  padding: 8rpx 16rpx;
  border: 1px solid #00BFFF;
  border-radius: 8rpx;
}

.send-code-btn.disabled {
  color: #ccc;
  border-color: #ccc;
}

.agreement {
  padding: 32rpx 0;
  font-size: 24rpx;
  color: #666;
}

.checkbox-label {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.link {
  color: #00BFFF;
}

.login-btn {
  background: #00BFFF;
  color: white;
  text-align: center;
  padding: 28rpx;
  border-radius: 50rpx;
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 24rpx;
}

.login-btn.disabled {
  background: #ccc;
}

.wechat-login-btn {
  background: #07c160;
  color: white;
  text-align: center;
  padding: 28rpx;
  border-radius: 50rpx;
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 40rpx;
}

.links {
  display: flex;
  justify-content: center;
  font-size: 26rpx;
  color: #666;
}

.divider {
  margin: 0 16rpx;
}

.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
}

.popup-sheet {
  width: 100%;
  max-height: 70vh;
  background: white;
  border-radius: 24rpx 24rpx 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.popup-header {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 104rpx;
  flex-shrink: 0;
}

.popup-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.popup-divider {
  height: 1px;
  background: #e5e5e5;
  flex-shrink: 0;
}

.popup-content {
  padding: 30rpx;
  box-sizing: border-box;
}

.popup-text {
  font-size: 28rpx;
  color: #333;
  line-height: 1.8;
  white-space: pre-wrap;
}

.popup-close {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 104rpx;
  flex-shrink: 0;
  border-top: 1px solid #f5f5f5;
  z-index: 1;
}

.close-text {
  font-size: 30rpx;
  color: #00BFFF;
  width: 100%;
  text-align: center;
  line-height: 104rpx;
}
</style>
