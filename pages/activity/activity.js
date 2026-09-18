/**
 * ============================================================================
 * LLS俱乐部 - 广场/动态(迭代版本)
 * ----------------------------------------------------------------------------
 * 【后端对接】统一走 utils/api.js(本地演示数据)
 *   • feedList({category}) : 动态列表      ← 本地数据 list
 *   • toggleLike(id)       : 点赞/取消      ← 本地数据 like
 *   • addView(id)          : 浏览统计 +1    ← 本地数据 view
 *   • gotoDetails(e)       → /circlePages/details/details?id=...
 *   • gotoPublish()        → /circlePages/edit/edit (需登录)
 * ============================================================================
 */
const app = getApp();
const api = require('../../utils/api.js');

Page({
  data: {
    statusBarHeight: 20,

    topTab: 1, // 0 关注 1 动态
    cateList: ['最新', '推荐', '热评', '点赞', '人气'],
    cateActive: 0,

    feedList: [],

    followList: [],       // 我关注的人
    followFeedList: [],   // 关注的人发布的动态
    followLoaded: false
  },

  onLoad() {
    this.setData({ statusBarHeight: app.globalData.statusBarHeight });
    this.loadFeed();
    this.loadFollow();
  },

  onShow() {
    // 发布返回 / 关注返回后刷新
    if (this._loaded) {
      this.loadFeed();
      if (this.data.topTab === 0) this.loadFollow();
    }
    this._loaded = true;
  },

  onPullDownRefresh() {
    this.loadFeed(() => wx.stopPullDownRefresh());
  },

  /** 动态列表 */
  loadFeed(done) {
    const cate = this.data.cateList[this.data.cateActive] || '最新';
    api.feedList({ category: cate, limit: 20 }).then((list) => {
      this.setData({ feedList: list || [] });
      done && done();
    }).catch(() => {
      this.setData({ feedList: [] });
      done && done();
    });
  },

  /** 关注Tab：我关注的人 + 他们发布的动态 */
  loadFollow(done) {
    Promise.all([api.followList(), api.followFeeds()]).then((res) => {
      this.setData({
        followList: res[0] || [],
        followFeedList: res[1] || [],
        followLoaded: true
      });
      done && done();
    }).catch(() => {
      this.setData({ followList: [], followFeedList: [], followLoaded: true });
      done && done();
    });
  },

  chooseTopTab(e) {
    const index = Number(e.currentTarget.dataset.index);
    this.setData({ topTab: index });
    // 切到关注Tab时拉取最新关注数据(在护航员主页关注/取关后即时生效)
    if (index === 0) this.loadFollow();
  },

  chooseCate(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (index === this.data.cateActive) return;
    this.setData({ cateActive: index });
    this.loadFeed();
  },

  /** 点赞/取消点赞(并发浏览统计，乐观更新) */
  toggleLike(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.feedList[index];
    if (!item) return;
    if (!app.globalData.token) {
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }
    const key = 'feedList[' + index + ']';
    const liked = !item.liked;
    this.setData({
      [key + '.liked']: liked,
      [key + '.likes']: Math.max(0, (item.likes || 0) + (liked ? 1 : -1))
    });
    api.toggleLike(item.id).then((res) => {
      if (res && typeof res.liked === 'boolean') {
        this.setData({ [key + '.liked']: res.liked, [key + '.likes']: res.likes });
      }
    }).catch(() => {
      this.setData({ [key + '.liked']: item.liked, [key + '.likes']: item.likes });
    });
  },

  /** 进入详情(浏览量由详情页 feedDetail 统一累加，避免重复统计) */
  gotoDetails(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/circlePages/details/details?id=' + id });
  },

  /** 关注Tab：点击头像/昵称进入 TA 的主页 */
  gotoPlayer(e) {
    const id = e.currentTarget.dataset.author || e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: '/circlePages/blogger_other/blogger_other?id=' + id });
  },

  /** 关注Tab动态点赞(乐观更新) */
  toggleFollowLike(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.followFeedList[index];
    if (!item) return;
    if (!app.globalData.token) {
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }
    const key = 'followFeedList[' + index + ']';
    const liked = !item.liked;
    this.setData({
      [key + '.liked']: liked,
      [key + '.likes']: Math.max(0, (item.likes || 0) + (liked ? 1 : -1))
    });
    api.toggleLike(item.id).then((res) => {
      if (res && typeof res.liked === 'boolean') {
        this.setData({ [key + '.liked']: res.liked, [key + '.likes']: res.likes });
      }
    }).catch(() => {
      this.setData({ [key + '.liked']: item.liked, [key + '.likes']: item.likes });
    });
  },

  gotoPublish() {
    app.gotoPage('/circlePages/edit/edit');
  },

  gotoSearch() {
    wx.navigateTo({ url: '/homePages/search/search' });
  }
});
