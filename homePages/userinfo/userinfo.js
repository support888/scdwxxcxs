/**
 * ============================================================================
 * LLS俱乐部 - 注册用户主页
 * ----------------------------------------------------------------------------
 * 通过 search 跳转过来的目标页。展示该用户「注册时填写的资料」：
 *   头像 / 昵称 / 性别 / ID / 生日(自动算年龄) / 身高 / 体重 / 城市 / 职业 /
 *   个性签名 / 兴趣标签 / 认证状态 / 手机号 / 粉丝数
 *
 * openid === 'me' 表示当前登录用户本人，按钮切换为「编辑资料」
 * 其他 openid 表示演示用户，按钮为「+ 关注 / 已关注」
 *
 * 接口：
 *   api.userDetail(openid) → 命中 'me' 走本地 profile，其它查演示数据
 * ============================================================================
 */
const app = getApp();
const api = require('../../utils/api.js');

function computeAge(birthday) {
  if (!birthday) return '';
  const d = new Date(birthday);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 ? String(age) : '';
}

function pickTags(selected, all) {
  const sel = selected || [];
  const pool = all && all.length ? all : sel;
  return pool.map(function (name) {
    return { name: name, on: sel.indexOf(name) > -1 };
  });
}

Page({
  data: {
    statusBarHeight: 20,
    openid: '',
    loading: true,
    isMe: false,
    notFound: false,
    user: {
      openid: '',
      nickname: '',
      avatar: '',
      avatarText: 'U',
      gender: 'm',
      shortId: '',
      phone: '',
      birthday: '',
      age: '',
      height: '',
      weight: '',
      city: '',
      job: '',
      signature: '',
      cover: '',
      verifyStatus: '未认证',
      fansCount: 0,
      followed: false,
      selectedTags: [],
      interestTags: []
    },
    tagList: [],
    ageText: ''
  },

  onLoad(options) {
    this.options = options || {};
    const openid = (options && options.openid) ? decodeURIComponent(options.openid) : '';
    this.setData({
      openid: openid,
      statusBarHeight: app.globalData.statusBarHeight || 20
    });
    if (!openid) {
      this.setData({ loading: false, notFound: true });
      return;
    }
    this.loadUser(openid);
  },

  loadUser(openid) {
    this.setData({ loading: true, notFound: false });
    api.userDetail(openid).then((u) => {
      const data = u || {};
      if (!data.nickname) {
        this.setData({ loading: false, notFound: true });
        return;
      }
      const age = computeAge(data.birthday);
      const tagList = pickTags(data.selectedTags, data.interestTags);
      this.setData({
        loading: false,
        isMe: !!data.isMe || openid === 'me',
        user: {
          openid: openid,
          nickname: data.nickname || '用户',
          avatar: data.avatar || '',
          avatarText: (data.nickname || 'U').slice(0, 1).toUpperCase(),
          gender: data.gender || 'm',
          shortId: data.shortId || '',
          phone: data.phone || '',
          birthday: data.birthday || '',
          age: age,
          height: data.height || '',
          weight: data.weight || '',
          city: data.city || '',
          job: data.job || '',
          signature: data.signature || '',
          cover: data.cover || '',
          verifyStatus: data.verifyStatus || '未认证',
          fansCount: data.fansCount || 0,
          followed: !!data.followed,
          selectedTags: data.selectedTags || [],
          interestTags: data.interestTags || []
        },
        tagList: tagList,
        ageText: age ? age + ' 岁' : ''
      });
    }).catch(() => {
      this.setData({ loading: false, notFound: true });
    });
  },

  goBack() {
    wx.navigateBack({ delta: 1, fail: () => wx.switchTab({ url: '/pages/index/index' }) });
  },

  /** 自己 → 编辑资料；其它 → 关注/取关(乐观更新) */
  onActionTap() {
    if (this.data.isMe) {
      wx.navigateTo({
        url: '/minePages/edit/edit',
        fail: function () {
          wx.showToast({ title: '请先登录', icon: 'none' });
        }
      });
      return;
    }
    const oid = this.data.openid;
    if (!oid) return;
    const cur = this.data.user;
    const next = !cur.followed;
    const fans = Math.max(0, (cur.fansCount || 0) + (next ? 1 : -1));
    this.setData({
      'user.followed': next,
      'user.fansCount': fans
    });
    api.followUser(oid).then((r) => {
      if (r && typeof r.fansCount === 'number') {
        this.setData({ 'user.fansCount': r.fansCount });
      }
    }).catch(() => {
      this.setData({
        'user.followed': cur.followed,
        'user.fansCount': cur.fansCount
      });
      wx.showToast({ title: '操作失败,请重试', icon: 'none' });
    });
  },

  copyId() {
    const id = this.data.user.shortId;
    if (!id) return;
    wx.setClipboardData({ data: id, success: () => {
      wx.showToast({ title: 'ID 已复制', icon: 'none' });
    }});
  },

  previewCover() {
    if (!this.data.user.cover) return;
    wx.previewImage({ urls: [this.data.user.cover] });
  }
});