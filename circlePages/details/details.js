/**
 * ============================================================================
 * LLS俱乐部 - 动态详情页
 * ----------------------------------------------------------------------------
 * 功能：动态正文 / 图片预览 / 浏览统计 / 点赞 / 评论 / 分享
 * 后端接口(utils/api.js，本地演示数据)：
 *   • feedDetail(id)        → lls-feed detail    (详情 + 浏览量+1 + 评论列表)
 *   • toggleLike(id)        → lls-feed like      (点赞/取消)
 *   • addComment(id, text)  → lls-feed comment   (发表评论)
 *   • addView(id)           → lls-feed view      (浏览量+1)
 * 入口：广场动态列表 → details?id=xxx ；护航员动态墙 → details?id=xxx
 * ============================================================================
 */
const app = getApp();
const api = require('../../utils/api.js');
const security = require('../../utils/security.js');

const COMMENT_CD = 5; // 评论冷却秒数(防刷屏)

function nowTime() {
  const d = new Date();
  const p = (n) => (n < 10 ? '0' + n : '' + n);
  return p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}

Page({
  data: {
    statusBarHeight: 20,
    loading: true,
    submitting: false,
    feed: null,
    commentList: [],
    commentInput: '',
    focusComment: false
  },

  onLoad(options) {
    this.options = options || {};
    this.feedId = this.options.id || '';
    this.setData({ statusBarHeight: (app.globalData && app.globalData.statusBarHeight) || 20 });
    this.loadDetail();
  },

  onPullDownRefresh() {
    this.loadDetail(() => wx.stopPullDownRefresh());
  },

  /** 加载详情(含浏览量 +1) */
  loadDetail(done) {
    if (!this.feedId) {
      wx.showToast({ title: '动态不存在', icon: 'none' });
      this.setData({ loading: false });
      done && done();
      return;
    }
    api.feedDetail(this.feedId).then((feed) => {
      if (!feed) {
        this.setData({ loading: false, feed: null });
        done && done();
        return;
      }
      this.setData({
        loading: false,
        feed: feed,
        commentList: feed.commentList || []
      });
      done && done();
    }).catch(() => {
      this.setData({ loading: false });
      done && done();
    });
  },

  /* -------------------- 导航 -------------------- */
  goBack() {
    wx.navigateBack({ delta: 1, fail: () => wx.switchTab({ url: '/pages/activity/activity' }) });
  },

  /* -------------------- 点赞 -------------------- */
  onLike() {
    if (!app.globalData.token) {
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }
    const feed = this.data.feed;
    if (!feed) return;
    // 乐观更新
    const liked = !feed.liked;
    this.setData({
      'feed.liked': liked,
      'feed.likes': Math.max(0, (feed.likes || 0) + (liked ? 1 : -1))
    });
    api.toggleLike(this.feedId).then((res) => {
      if (res && typeof res.liked === 'boolean') {
        this.setData({ 'feed.liked': res.liked, 'feed.likes': res.likes });
      }
    }).catch(() => {
      this.setData({ 'feed.liked': feed.liked, 'feed.likes': feed.likes });
      wx.showToast({ title: '操作失败，请重试', icon: 'none' });
    });
  },

  /* -------------------- 图片预览 -------------------- */
  previewImage(e) {
    const idx = Number(e.currentTarget.dataset.index) || 0;
    const urls = (this.data.feed && this.data.feed.images) || [];
    if (!urls.length) return;
    wx.previewImage({ current: urls[idx], urls: urls });
  },

  /* -------------------- 评论 -------------------- */
  onCommentInput(e) {
    this.setData({ commentInput: e.detail.value });
  },

  focusComment() {
    this.setData({ focusComment: true });
  },

  onSubmitComment() {
    if (this.data.submitting) return;
    const raw = (this.data.commentInput || '').trim();
    if (!raw) {
      wx.showToast({ title: '请输入评论内容', icon: 'none' });
      return;
    }

    // 三级敏感词 + 防刷屏
    const g = security.guard(raw, { key: 'comment', cd: COMMENT_CD });
    if (!g.ok) {
      if (g.level === 'rate') wx.showToast({ title: g.message, icon: 'none' });
      else security.toastByReason(g);
      return;
    }
    const content = g.masked;

    this.setData({ submitting: true });
    const user = app.globalData.userInfo || {};
    api.addComment(this.feedId, content, {
      name: user.nickname || '我',
      avatarText: '我'
    }).then((res) => {
      security.markRate('comment');
      const comment = res && res.comment ? res.comment : {
        id: 'c' + Date.now(),
        name: user.nickname || '我',
        avatarText: '我',
        content: content,
        time: nowTime(),
        likes: 0
      };
      this.setData({
        submitting: false,
        commentInput: '',
        focusComment: false,
        commentList: this.data.commentList.concat([comment]),
        'feed.comments': (res && typeof res.comments === 'number') ? res.comments : (this.data.feed.comments || 0) + 1
      });
      wx.showToast({ title: '评论成功', icon: 'success' });
    }).catch(() => {
      this.setData({ submitting: false });
      wx.showToast({ title: '评论失败，请重试', icon: 'none' });
    });
  },

  onShareAppMessage() {
    const feed = this.data.feed || {};
    return {
      title: feed.content ? feed.content.slice(0, 30) : 'LLS俱乐部-动态详情',
      path: '/circlePages/details/details?id=' + this.feedId
    };
  }
});
