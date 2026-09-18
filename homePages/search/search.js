/* LLS club - 搜索(注册用户:昵称 / ID) */
const app = getApp();
const api = require('../../utils/api.js');

const HISTORY_KEY = 'lls_search_history_v1';

Page({
  data: {
    keyword: '',
    list: [],
    searched: false,
    loading: false,
    history: [],
    statusBarHeight: 20
  },

  onLoad(options) {
    this.options = options || {};
    const kw = this.options.keyword || '';
    const history = wx.getStorageSync(HISTORY_KEY) || [];
    this.setData({
      history: history,
      keyword: kw,
      autoFocus: !kw,
      statusBarHeight: app.globalData.statusBarHeight || 20
    });
    if (kw) this.doSearch();
  },

  onInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  onClear() {
    this.setData({ keyword: '', list: [], searched: false, autoFocus: true });
  },

  onTagTap(e) {
    this.setData({ keyword: e.currentTarget.dataset.kw });
    this.doSearch();
  },

  doSearch() {
    const kw = String(this.data.keyword || '').trim();
    if (!kw) {
      wx.showToast({ title: '请输入昵称或ID', icon: 'none' });
      return;
    }
    this.saveHistory(kw);
    this.setData({ loading: true, searched: true });
    api.searchUsers(kw).then((list) => {
      this.setData({
        loading: false,
        list: (list || []).map((u) => ({
          id: u.id || u.openid,
          openid: u.openid || '',
          isMe: !!u.isMe,
          shortId: u.shortId || (u.openid || '').slice(-6),
          nickname: u.nickname || '用户',
          avatar: u.avatar || '',
          avatarText: (u.nickname || 'U').slice(0, 1).toUpperCase(),
          gender: u.gender || 'm',
          city: u.city || '',
          signature: u.signature || '',
          fansCount: u.fansCount || 0,
          followed: !!u.followed
        }))
      });
    }).catch(() => {
      this.setData({ loading: false, list: [] });
    });
  },

  saveHistory(kw) {
    let h = this.data.history.filter((x) => x !== kw);
    h.unshift(kw);
    h = h.slice(0, 10);
    wx.setStorageSync(HISTORY_KEY, h);
    this.setData({ history: h });
  },

  gotoUser(e) {
    const idx = e && e.currentTarget ? e.currentTarget.dataset.index : -1;
    const item = (idx >= 0 ? this.data.list[idx] : null) || this.data.list[0];
    if (!item) return;
    const oid = item.openid || item.id || '';
    if (!oid) {
      wx.showToast({ title: '该用户暂无主页', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/homePages/userinfo/userinfo?openid=' + encodeURIComponent(oid) });
  },

  /** 关注/取关(乐观更新,失败回滚) */
  onFollowUser(e) {
    const idx = e.currentTarget.dataset.index;
    const item = this.data.list[idx];
    if (!item || !item.openid) return;
    if (item.isMe || item.openid === 'me') {
      wx.showToast({ title: '不能关注自己哦', icon: 'none' });
      return;
    }
    const next = !item.followed;
    const fans = Math.max(0, (item.fansCount || 0) + (next ? 1 : -1));
    this.setData({
      ['list[' + idx + '].followed']: next,
      ['list[' + idx + '].fansCount']: fans
    });
    api.followUser(item.openid).then((r) => {
      if (r && typeof r.fansCount === 'number') {
        this.setData({ ['list[' + idx + '].fansCount']: r.fansCount });
      }
    }).catch(() => {
      this.setData({
        ['list[' + idx + '].followed']: item.followed,
        ['list[' + idx + '].fansCount']: item.fansCount || 0
      });
      wx.showToast({ title: '操作失败,请重试', icon: 'none' });
    });
  }
});
