/**
 * ============================================================================
 * LLS俱乐部 - 设置
 * ----------------------------------------------------------------------------
 * 后端接口(utils/api.js，本地演示数据)：
 *   • profile()            → 我的资料     手机号 / 实名认证状态
 *   • settings()           → 设置项       四个开关回填
 *   • saveSettings(patch)  → 保存设置项   开关即时保存
 *
 * 页面结构：
 *   卡1 账户与资料 / 手机号 / 实名认证 / 我的收入
 *   卡2 个性化内容推荐 / 推送通知 / 是否允许查看我的关注 / 是否允许查看我的粉丝
 *   卡3 账号注销 / 退出登录
 * ============================================================================
 */
const app = getApp();
const api = require('../../utils/api.js');

Page({
  data: {
    statusBarHeight: 20,
    profile: { phone: '', verifyStatus: '未认证' },
    settings: {
      recommend: true,
      pushNotify: true,
      showFollow: true,
      showFans: true
    }
  },

  onLoad() {
    this.setData({ statusBarHeight: app.globalData.statusBarHeight || 20 });
    this.loadAll();
  },

  onShow() {
    if (this._loaded) this.loadAll();
    this._loaded = true;
  },

  /** 拉取资料 + 设置 */
  loadAll() {
    api.profile().then((p) => {
      this.setData({ profile: p || {} });
    }).catch(() => { /* 本地兜底失败忽略 */ });

    api.settings().then((s) => {
      this.setData({ settings: Object.assign({}, this.data.settings, s || {}) });
    }).catch(() => { /* 本地兜底失败忽略 */ });
  },

  /** 开关切换(乐观更新 + 失败回滚) */
  onSwitch(e) {
    const key = e.currentTarget.dataset.key;
    if (!key) return;
    const value = !!e.detail.value;
    const prev = this.data.settings;
    this.setData({ ['settings.' + key]: value });

    api.saveSettings({ [key]: value }).then((res) => {
      if (res) this.setData({ settings: Object.assign({}, this.data.settings, res) });
    }).catch(() => {
      this.setData({ ['settings.' + key]: prev[key] });
      wx.showToast({ title: '设置失败,请重试', icon: 'none' });
    });
  },

  /** 账户与资料 → 资料修改 */
  gotoAccount() {
    wx.navigateTo({ url: '/minePages/edit/edit' });
  },

  /** 我的收入 */
  gotoIncome() {
    wx.navigateTo({ url: '/minePages/shouru/shouru' });
  },

  /** 实名认证 */
  gotoRenzheng() {
    wx.navigateTo({ url: '/minePages/renzheng/renzheng' });
  },

  /** 账号注销 */
  onCancelAccount() {
    wx.showModal({
      title: '账号注销',
      content: '注销后账号内的资料、订单与收益数据将被清除且无法恢复，确定继续吗？',
      confirmText: '继续注销',
      confirmColor: '#ff444d',
      success: (res) => {
        if (!res.confirm) return;
        wx.showToast({ title: '注销申请已提交', icon: 'none' });
      }
    });
  },

  /** 退出登录 */
  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出当前账号吗？',
      confirmText: '退出',
      confirmColor: '#ff444d',
      success: (res) => {
        if (!res.confirm) return;
        try {
          wx.removeStorageSync('lls_token');
          wx.removeStorageSync('lls_user');
          wx.removeStorageSync('lls_openid');
        } catch (e) { /* ignore */ }
        app.globalData.token = '';
        app.globalData.userInfo = null;
        app.globalData.openid = '';
        wx.showToast({ title: '已退出登录', icon: 'success' });
        setTimeout(() => wx.switchTab({ url: '/pages/mine/mine' }), 600);
      }
    });
  },

  goBack() {
    wx.navigateBack({ delta: 1, fail: () => wx.switchTab({ url: '/pages/mine/mine' }) });
  }
});
