/**
 * ============================================================================
 * LLS俱乐部 - 护航员主页(用户展示页)
 * ----------------------------------------------------------------------------
 * 页面内容：封面资料 / 等级 / 日常派单 / 个性标签 / 我的服务介绍 / 技能卡片 / 评价
 *          关于TA · 礼物墙 · 动态墙 三 Tab
 * 后端接口(utils/api.js，本地演示数据)：
 *   • playerDetail(id)  → GET  lls-player detail     (含评价、动态墙、关注态)
 *   • toggleFollow(id)  → POST lls-player follow     (关注/取关)
 *   (动态浏览量由详情页 feedDetail 统一累加，本页不再单独调用 addView)
 * 入口：首页护航员卡片 / 游戏海报 → blogger_other?id=xxx|gameId=xxx
 * ============================================================================
 */
const app = getApp();
const api = require('../../utils/api.js');

const COVER_GRADIENTS = [
  'linear-gradient(135deg, #12324f 0%, #0a1a30 55%, #061021 100%)',
  'linear-gradient(135deg, #3a1c3f 0%, #1a1030 55%, #0a0618 100%)',
  'linear-gradient(135deg, #0f3a30 0%, #0a2130 55%, #061018 100%)',
  'linear-gradient(135deg, #4a2a12 0%, #2a160a 55%, #140a04 100%)',
  'linear-gradient(135deg, #12294f 0%, #0a1730 55%, #060c18 100%)'
];

function starArray(score) {
  const n = Math.round(Number(score) || 5);
  const arr = [];
  for (let i = 1; i <= 5; i++) arr.push({ i: i, on: i <= n });
  return arr;
}

Page({
  data: {
    statusBarHeight: 20,
    loading: true,
    tabActive: 0,          // 0 关于TA · 1 礼物墙 · 2 动态墙
    giftCount: 1,
    stars: starArray(5),
    coverGradient: COVER_GRADIENTS[0],
    player: {
      name: '',
      avatar: '',
      avatarText: 'L',
      coverCorner: '',
      level: '',
      rank: '',
      city: '',
      badge: '',
      score: '5.0',
      skillIntro: '',
      signature: '',
      job: '未设置',
      age: 0,
      zodiac: '',
      tags: [],
      personalityTags: [],
      skillTags: [],
      services: [],
      skills: [],
      reviews: [],
      feeds: [],
      followed: false,
      fansCount: 0,
      followCount: 0,
      likeCount: 0
    }
  },

  onLoad(options) {
    this.options = options || {};
    this.setData({ statusBarHeight: (app.globalData && app.globalData.statusBarHeight) || 20 });
    this.loadPlayer();
  },

  onPullDownRefresh() {
    this.loadPlayer(() => wx.stopPullDownRefresh());
  },

  /** 加载护航员详情 */
  loadPlayer(done) {
    const rawId = this.options.id || this.options.gameId || this.options.playerId || '1';
    this.pid = String(rawId);
    this.setData({ loading: true });

    api.playerDetail(this.pid).then((p) => {
      if (!p) { this.setData({ loading: false }); done && done(); return; }

      const reviews = (p.reviews || []).map((r) => Object.assign({}, r, { starArr: starArray(r.score) }));
      const feeds = p.feeds || [];
      const seed = parseInt(this.pid, 10) || 0;

      this.setData({
        loading: false,
        coverGradient: COVER_GRADIENTS[seed % COVER_GRADIENTS.length],
        stars: starArray(p.score),
        player: Object.assign({}, this.data.player, p, { reviews: reviews, feeds: feeds })
      });
      done && done();
    }).catch(() => {
      this.setData({ loading: false });
      done && done();
    });
  },

  /* -------------------- 导航 -------------------- */
  goBack() {
    wx.navigateBack({ delta: 1, fail: () => wx.switchTab({ url: '/pages/index/index' }) });
  },

  gotoHome() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  chooseTab(e) {
    this.setData({ tabActive: Number(e.currentTarget.dataset.index) });
  },

  /* -------------------- 关注 -------------------- */
  onFollow() {
    if (!app.globalData.token) {
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }
    const followed = this.data.player.followed;
    // 乐观更新
    const base = this.data.player.fansCount || 0;
    this.setData({
      'player.followed': !followed,
      'player.fansCount': Math.max(0, base + (followed ? -1 : 1))
    });
    api.toggleFollow(this.pid).then((res) => {
      if (res && typeof res.followed === 'boolean') {
        this.setData({
          'player.followed': res.followed,
          'player.fansCount': res.fansCount
        });
      }
      wx.showToast({ title: res && res.followed ? '关注成功' : '已取消关注', icon: 'none' });
    }).catch(() => {
      this.setData({ 'player.followed': followed, 'player.fansCount': base });
      wx.showToast({ title: '操作失败，请重试', icon: 'none' });
    });
  },

  /* -------------------- 服务/下单 -------------------- */
  onConsult(e) {
    const name = e.currentTarget.dataset.name || '服务';
    wx.showToast({ title: '已通知客服：' + name, icon: 'none' });
    // TODO 接入客服会话：wx.openCustomerServiceChat / 后端派单
  },

  onOrder(e) {
    const game = e.currentTarget.dataset.game || '';
    if (!app.globalData.token) {
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }
    wx.showModal({
      title: '确认下单',
      content: '即将跳转到「' + game + '」派单流程，确认继续？',
      confirmColor: '#00e5ff',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({ url: '/gamePages/paidan_menu/paidan_menu?game=' + encodeURIComponent(game) + '&playerId=' + this.pid });
        }
      }
    });
  },

  /** 动态墙点击：跳转动态详情(浏览量由详情页 feedDetail 统一累加，避免重复 +1) */
  gotoFeed(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/circlePages/details/details?id=' + id });
  },

  onShareAppMessage() {
    return {
      title: this.data.player.name || 'LLS俱乐部-护航员主页',
      path: '/circlePages/blogger_other/blogger_other?id=' + this.pid
    };
  }
});
