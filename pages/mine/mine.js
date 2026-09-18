/**
 * ============================================================================
 * LLS俱乐部 - 我的(迭代版本)
 * ----------------------------------------------------------------------------
 * 【AI 后端锚点】写后端时优先看本注释,定位需对接的位置
 * ============================================================================
 * 1. 数据(data) - 需后端提供
 *   • isLogin          : 登录状态                  ← 取自 app.globalData.token
 *   • userInfo         : 用户信息(昵称/头像/手机/ID) ← GET /api/user/profile
 *   • gridMenus[]      : 九宫格菜单(5个,带登录校验)  ← 可选 GET /api/menus
 *
 * 2. 关键函数
 *   • onShow()         : 每次显示刷新登录态 + 用户信息
 *   • copyId()         : 复制用户ID到剪贴板
 *   • gotoUrl(e)       : 跳转菜单(按 check 决定是否登录校验)
 *   • gotoEdit()       → /minePages/edit/edit (需登录)
 *   • gotoLogin()      → /pages/login/login
 *   • gotoSet()        → /minePages/set/set (需登录)
 * ============================================================================
 */
const app = getApp();

Page({
  data: {
    statusBarHeight: 20,
    isLogin: false,
    userInfo: {
      nickname: 'Lucas66',
      avatar: '',
      phone: '19308400219',
      id: '148760'
    },

    gridMenus: [
      { title: '我的优惠券', icon: '🎟', url: '/minePages/lingquan_my/lingquan_my', bg: 'linear-gradient(135deg,#ff6d7a,#f43f5e)', shadow: 'rgba(244,63,94,0.4)', check: true },
      { title: '实名认证', icon: '🛡', url: '/minePages/renzheng/renzheng', bg: 'linear-gradient(135deg,#7c8cff,#5a6cf0)', shadow: 'rgba(90,108,240,0.4)', check: true },
      { title: '关于我们', icon: '✉', url: '/homePages/about/about', bg: 'linear-gradient(135deg,#f06db5,#e0447f)', shadow: 'rgba(224,68,127,0.4)', check: false },
      { title: '隐私政策', icon: '⭐', url: '/homePages/about/about?type=privacy', bg: 'linear-gradient(135deg,#ffc94d,#ff9f1a)', shadow: 'rgba(255,159,26,0.4)', check: false },
      { title: '设置', icon: '⚙', url: '/minePages/set/set', bg: 'linear-gradient(135deg,#33d6e8,#0ea5c9)', shadow: 'rgba(14,165,201,0.4)', check: true }
    ]
  },

  onShow() {
    const g = app.globalData;
    const user = wx.getStorageSync('lls_user');
    this.setData({
      statusBarHeight: g.statusBarHeight,
      isLogin: !!g.token,
      userInfo: user || this.data.userInfo
    });
  },

  copyId() {
    if (!this.data.isLogin) return;
    wx.setClipboardData({
      data: String(this.data.userInfo.id),
      success: () => wx.showToast({ title: 'ID已复制', icon: 'success' })
    });
  },

  gotoUrl(e) {
    const { url, check } = e.currentTarget.dataset;
    app.gotoPage(url, check === 'true' || check === true);
  },

  gotoEdit() {
    app.gotoPage('/minePages/edit/edit');
  },

  gotoLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  gotoSet() {
    app.gotoPage('/minePages/set/set');
  }
});
