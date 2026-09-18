/**
 * LLS俱乐部 - 圈子
 */
const app = getApp();

Page({
  data: {
    statusBarHeight: 20,
    circleList: [
      { id: 1, name: '开黑车队圈', desc: '组队上分 · 一起开黑', count: '2.3万', theme: 'cyan' },
      { id: 2, name: '大神攻略圈', desc: '攻略教程 · 赛事资讯', count: '1.8万', theme: 'purple' },
      { id: 3, name: '陪玩日常圈', desc: '陪玩日常 · 欢乐瞬间', count: '9800', theme: 'gold' },
      { id: 4, name: '俱乐部公告圈', desc: '官方公告 · 活动通知', count: '5.6万', theme: 'cyan' }
    ]
  },

  onLoad() {
    this.setData({ statusBarHeight: app.globalData.statusBarHeight });
  },

  gotoCircle(e) {
    wx.navigateTo({ url: `/circlePages/details?id=${e.currentTarget.dataset.id}` });
  },

  gotoAll() {
    wx.navigateTo({ url: '/homePages/quanclass' });
  }
});
