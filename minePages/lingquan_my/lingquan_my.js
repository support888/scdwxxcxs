/**
 * ============================================================================
 * LLS俱乐部 - 我的优惠券(领券页面)
 * ----------------------------------------------------------------------------
 * 后端接口(utils/api.js，本地演示数据)：
 *   • coupons()  → 我的优惠券数据 → { count, list }
 * 页面结构：蓝色渐变统计卡(可用张数 + 去使用) + 我的优惠券列表 / 空态
 * 入口：我的页「我的优惠券」宫格 → /minePages/lingquan_my/lingquan_my
 * ============================================================================
 */
const app = getApp();
const api = require('../../utils/api.js');

Page({
  data: {
    statusBarHeight: 20,
    count: 0,
    list: []
  },

  onLoad() {
    this.setData({ statusBarHeight: app.globalData.statusBarHeight || 20 });
    this.loadCoupons();
  },

  onShow() {
    if (this._loaded) this.loadCoupons();
    this._loaded = true;
  },

  onPullDownRefresh() {
    this.loadCoupons(() => wx.stopPullDownRefresh());
  },

  /** 可用优惠券列表 */
  loadCoupons(done) {
    api.coupons().then((res) => {
      const list = (res && res.list) || [];
      this.setData({
        list: list,
        count: (res && typeof res.count === 'number') ? res.count : list.length
      });
      done && done();
    }).catch(() => {
      this.setData({ list: [], count: 0 });
      done && done();
    });
  },

  /** 去使用 → 领券中心 */
  gotoUse() {
    wx.navigateTo({ url: '/minePages/lingquan/lingquan' });
  },

  useCoupon() {
    this.gotoUse();
  },

  goBack() {
    wx.navigateBack({ delta: 1, fail: () => wx.switchTab({ url: '/pages/mine/mine' }) });
  }
});
