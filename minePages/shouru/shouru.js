/**
 * ============================================================================
 * LLS俱乐部 - 我的收入
 * ----------------------------------------------------------------------------
 * 后端接口(utils/api.js，本地演示数据)：
 *   • income()  → 我的收入数据
 *                 → { balance, totalIncome, withdrawn, pending, todayIncome, monthIncome, list }
 * 页面结构：可提现余额卡 / 收入概览 / 收入明细
 * 入口：设置页「我的收入」 → /minePages/shouru/shouru
 * ============================================================================
 */
const app = getApp();
const api = require('../../utils/api.js');

Page({
  data: {
    statusBarHeight: 20,
    data: {
      balance: 0,
      totalIncome: 0,
      withdrawn: 0,
      pending: 0,
      todayIncome: 0,
      monthIncome: 0,
      list: []
    },
    loading: true
  },

  onLoad() {
    this.setData({ statusBarHeight: app.globalData.statusBarHeight || 20 });
    this.loadIncome();
  },

  onShow() {
    if (this._loaded) this.loadIncome();
    this._loaded = true;
  },

  onPullDownRefresh() {
    this.loadIncome(() => wx.stopPullDownRefresh());
  },

  /** 收入总览 + 明细 */
  loadIncome(done) {
    api.income().then((res) => {
      this.setData({
        data: Object.assign({}, this.data.data, res || {}),
        loading: false
      });
      done && done();
    }).catch(() => {
      this.setData({ loading: false });
      done && done();
    });
  },

  /** 去提现 */
  gotoWithdraw() {
    wx.navigateTo({ url: '/minePages/shouru_ti/shouru_ti' });
  },

  /** 全部收入明细 */
  gotoLog() {
    wx.navigateTo({ url: '/minePages/money_log_shouru/money_log_shouru' });
  },

  goBack() {
    wx.navigateBack({ delta: 1, fail: () => wx.switchTab({ url: '/pages/mine/mine' }) });
  }
});
