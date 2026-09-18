/**
 * ============================================================================
 * LLS俱乐部 - 登录/注册
 * ----------------------------------------------------------------------------
 * 真实注册流程(微信官方「头像昵称填写能力」):
 *   ① 用户点头像按钮 → open-type="chooseAvatar" 拿到临时头像
 *   ② 用户填昵称     → input type="nickname"(微信键盘联想昵称)
 *   ③ 点登录 → 保存头像昵称 → saveProfile 写入注册用户(即注册)
 *   ④ 登录态写入 globalData + 本地缓存
 * 当前为本地登录(仅本机可见)；接入自建后端后走真实注册。
 * ============================================================================
 */
const app = getApp();
const api = require('../../utils/api.js');

Page({
  data: {
    agreed: false,
    logging: false,
    avatarUrl: '',
    nickname: ''
  },

  toggleAgree() {
    this.setData({ agreed: !this.data.agreed });
  },

  /** 选择微信头像(官方能力,返回临时文件路径) */
  onChooseAvatar(e) {
    if (e.detail && e.detail.avatarUrl) {
      this.setData({ avatarUrl: e.detail.avatarUrl });
    }
  },

  /** 昵称输入(type=nickname 支持微信昵称快速填入) */
  onNickInput(e) {
    this.setData({ nickname: (e.detail.value || '').trim() });
  },

  doLogin() {
    if (!this.data.agreed) {
      wx.showToast({ title: '请先勾选用户协议', icon: 'none' });
      return;
    }
    if (this.data.logging) return;

    const nickname = (this.data.nickname || '').trim();
    if (!nickname) {
      wx.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }

    this.setData({ logging: true });

    // ① 头像处理(未选头像时返回空串；接入自建后端后为真实上传)
    const upload = this.data.avatarUrl
      ? api.uploadImages([this.data.avatarUrl])
      : Promise.resolve(['']);
    const t = this;

    upload.then(function (urls) {
      const avatar = (urls && urls[0]) || '';
      // ② 注册/更新资料到云端 lls_users(失败不阻塞,降级本地登录态)
      return api.saveProfile({
        nickname: nickname,
        avatar: avatar
      }).catch(function () { return null; }).then(function () {
        return avatar;
      });
    }).then(function (avatar) {
      // ③ 写入登录态(openid 由 app.js 启动时经 lls-login 取回)
      let openid = app.globalData.openid || '';
      if (!openid) {
        try { openid = wx.getStorageSync('lls_openid') || ''; } catch (e) { /* ignore */ }
      }
      const user = {
        nickname: nickname,
        avatar: avatar,
        avatarText: nickname.slice(0, 1).toUpperCase(),
        gender: 'm',
        level: 1,
        vipName: '普通用户'
      };
      app.globalData.token = openid || ('local-' + Date.now());
      app.globalData.userInfo = user;
      try {
        wx.setStorageSync('lls_token', app.globalData.token);
        wx.setStorageSync('lls_user', user);
      } catch (e) { /* ignore */ }

      t.setData({ logging: false });
      wx.showToast({ title: nickname + ',欢迎加入', icon: 'none' });
      setTimeout(function () {
        wx.navigateBack({ fail: function () { wx.switchTab({ url: '/pages/index/index' }); } });
      }, 900);
    }).catch(function () {
      t.setData({ logging: false });
      wx.showToast({ title: '登录失败,请重试', icon: 'none' });
    });
  },

  showAgreement() {
    wx.showModal({
      title: '用户协议',
      content: '欢迎使用 LLS俱乐部,登录即代表您同意《用户协议》与《隐私政策》。',
      showCancel: false,
      confirmColor: '#00e5ff'
    });
  }
});
