/**
 * LLS俱乐部 - App 入口
 * 深色科技风主题 · 原生微信小程序 · 本地演示数据
 */
App({
  onLaunch() {
    const sys = wx.getSystemInfoSync();
    this.globalData.statusBarHeight = sys.statusBarHeight || 20;
    this.globalData.screenWidth = sys.screenWidth || 375;
    this.globalData.screenHeight = sys.screenHeight || 667;
    this.globalData.platform = sys.platform || 'devtools';

    // 恢复登录态
    try {
      const token = wx.getStorageSync('lls_token');
      if (token) this.globalData.token = token;
      const user = wx.getStorageSync('lls_user');
      if (user) this.globalData.userInfo = user;
      const openid = wx.getStorageSync('lls_openid');
      if (openid) this.globalData.openid = openid;
    } catch (e) { /* ignore */ }
  },

  globalData: {
    // 系统信息
    statusBarHeight: 20,
    screenWidth: 375,
    screenHeight: 667,
    platform: 'devtools',
    // 自定义导航栏高度(状态栏 + 44px 导航内容)
    navBarHeight: 64,

    // 登录态
    token: '',
    userInfo: null,

    // 用户标识(用于点赞/评论/关注身份识别)
    openid: '',

    // 平台配置(对应原 bossSwich)
    bossSwich: {
      is_player: 1,      // 是否开启玩家/护航功能
      partner_type: 1,   // 合作模式
      is_dianping: 1     // 是否开启点评
    },

    // 系统公告
    announcement: '俱乐部/老板接派单提供技术服务，不承担任何担保责任，交易请走平台流程保障双方权益',

    // 本地后台地址(admin-server)。后台未启动时自动走本地演示数据
    apiBaseUrl: 'http://127.0.0.1:3000'
  },

  /** 通用跳转(登录校验) */
  gotoPage(url, checkLogin = true) {
    if (checkLogin && !this.globalData.token) {
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }
    wx.navigateTo({ url });
  }
});
