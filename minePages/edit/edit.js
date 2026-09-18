/**
 * ============================================================================
 * LLS俱乐部 - 账户与资料(资料修改)
 * ----------------------------------------------------------------------------
 * 页面内容：头像 / 性别 / 昵称 / 生日(必填) / 身高 / 体重 / 职业 /
 *          城市 / 个性签名 / 兴趣标签 / 背景图 / 确认保存
 *
 * 后端接口(utils/api.js，本地演示数据)：
 *   • profile()      → 本地资料      回填资料
 *   • saveProfile()  → 本地保存      保存资料
 *   • uploadImages() → 原样返回本地路径(接入自建后端时替换为真实上传)
 *
 * 内容安全：复用 utils/security.js
 *   • 昵称    : 严格(block/mask/ad 全部禁止)
 *   • 个性签名: block 禁止;mask/ad 自动替换为 * 后保存
 * ============================================================================
 */
const app = getApp();
const api = require('../../utils/api.js');
const security = require('../../utils/security.js');

const INTEREST_TAGS = ['护航', '陪玩', '聊天', 'PC', '手游', '双端'];

function buildTags(selected) {
  const sel = selected || [];
  return INTEREST_TAGS.map(function (name, i) {
    return { name: name, on: sel.indexOf(name) > -1, cls: 'tag-t' + (i % 3) };
  });
}

Page({
  data: {
    statusBarHeight: 20,
    form: {
      avatar: '',
      gender: 'm',
      nickname: '',
      birthday: '',
      height: '',
      weight: '',
      job: '',
      city: '',
      signature: '',
      cover: ''
    },
    tags: buildTags([]),
    maxNick: 20,
    maxSign: 100,
    nickLevel: 'ok',
    nickTip: '',
    signLevel: 'ok',
    signTip: '',
    submitting: false
  },

  onLoad() {
    this.setData({ statusBarHeight: app.globalData.statusBarHeight || 20 });
    this.loadProfile();
  },

  /** 资料回填 */
  loadProfile() {
    api.profile().then((p) => {
      const data = p || {};
      const sign = data.signature || '';
      const nick = data.nickname || '';
      const ns = security.scan(nick);
      const ss = security.scan(sign);
      this.setData({
        form: {
          avatar: data.avatar || '',
          gender: data.gender || 'm',
          nickname: nick,
          birthday: data.birthday || '',
          height: data.height || '',
          weight: data.weight || '',
          job: data.job || '',
          city: data.city || '',
          signature: sign,
          cover: data.cover || ''
        },
        tags: buildTags(data.selectedTags),
        nickLevel: ns.level,
        nickTip: ns.message,
        signLevel: ss.level,
        signTip: ss.message
      });
    }).catch(() => { /* 保持默认空表单 */ });
  },

  goBack() {
    wx.navigateBack({ delta: 1, fail: () => wx.switchTab({ url: '/pages/mine/mine' }) });
  },

  /** 选择头像(微信原生) */
  onChooseAvatar(e) {
    const url = e.detail && e.detail.avatarUrl;
    if (!url) return;
    this.setData({ 'form.avatar': url });
  },

  /** 选择性别 */
  chooseGender(e) {
    this.setData({ 'form.gender': e.currentTarget.dataset.gender });
  },

  onNicknameInput(e) {
    const value = e.detail.value || '';
    const s = security.scan(value);
    this.setData({ 'form.nickname': value, nickLevel: s.level, nickTip: s.message });
  },

  onBirthday(e) {
    this.setData({ 'form.birthday': e.detail.value });
  },

  onInput(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ ['form.' + key]: e.detail.value });
  },

  onSignatureInput(e) {
    const value = e.detail.value || '';
    const s = security.scan(value);
    this.setData({ 'form.signature': value, signLevel: s.level, signTip: s.message });
  },

  /** 兴趣标签多选 */
  toggleTag(e) {
    const index = Number(e.currentTarget.dataset.index);
    const tags = this.data.tags.slice();
    if (!tags[index]) return;
    tags[index] = Object.assign({}, tags[index], { on: !tags[index].on });
    this.setData({ tags: tags });
  },

  /** 选择背景图 */
  chooseCover() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0];
        if (!file) return;
        this.setData({ 'form.cover': file.tempFilePath });
      }
    });
  },

  previewCover() {
    if (!this.data.form.cover) { this.chooseCover(); return; }
    wx.previewImage({ urls: [this.data.form.cover] });
  },

  /** 确认保存 */
  onSave() {
    if (this.data.submitting) return;
    const form = this.data.form;
    const nick = (form.nickname || '').trim();

    if (!nick) {
      wx.showToast({ title: '请填写昵称', icon: 'none' });
      return;
    }
    if (nick.length > this.data.maxNick) {
      wx.showToast({ title: '昵称最多' + this.data.maxNick + '字', icon: 'none' });
      return;
    }
    if (!form.birthday) {
      wx.showToast({ title: '请填写生日', icon: 'none' });
      return;
    }
    if ((form.signature || '').length > this.data.maxSign) {
      wx.showToast({ title: '个性签名最多' + this.data.maxSign + '字', icon: 'none' });
      return;
    }

    // ① 本地敏感词守卫
    const nickGuard = security.guard(nick, { cd: 0, blockMask: true });
    if (!nickGuard.ok) {
      this.setData({ nickLevel: nickGuard.level, nickTip: nickGuard.message });
      wx.showToast({ title: '昵称含敏感词,请修改', icon: 'none' });
      return;
    }
    const signText = (form.signature || '').trim();
    const signGuard = security.guard(signText, { cd: 0 });
    if (!signGuard.ok) {
      this.setData({ signLevel: signGuard.level, signTip: signGuard.message });
      wx.showToast({ title: signGuard.message || '个性签名含违规内容', icon: 'none' });
      return;
    }
    const finalSign = signGuard.masked;

    this.setData({ submitting: true });
    wx.showLoading({ title: '保存中...', mask: true });

    // ② 服务端内容复核(未配置时自动放行)
    security.checkFields([
      { name: '昵称', value: nick, scene: security.SCENE.PROFILE },
      { name: '个性签名', value: finalSign, scene: security.SCENE.PROFILE }
    ]).then((res) => {
      if (!res.pass) {
        wx.hideLoading();
        this.setData({ submitting: false });
        security.toastByReason(res.item);
        return Promise.reject('blocked');
      }
      // ③ 头像 / 背景图上传(无云端环境时原样返回本地路径)
      return api.uploadImages([form.avatar, form.cover]);
    }).then((urls) => {
      const selectedTags = this.data.tags.filter(function (t) { return t.on; }).map(function (t) { return t.name; });
      // ④ 提交后端
      return api.saveProfile({
        avatar: (urls && urls[0]) || form.avatar || '',
        gender: form.gender,
        nickname: nick,
        birthday: form.birthday,
        height: form.height,
        weight: form.weight,
        job: form.job,
        city: form.city,
        signature: finalSign,
        interestTags: INTEREST_TAGS,
        selectedTags: selectedTags,
        cover: (urls && urls[1]) || form.cover || ''
      });
    }).then((res) => {
      // ⑤ 本地缓存同步(我的页 / 展示页即时生效)
      const old = wx.getStorageSync('lls_user') || {};
      const saved = Object.assign({}, old, res || {});
      try { wx.setStorageSync('lls_user', saved); } catch (e) { /* ignore */ }
      if (app.globalData) app.globalData.userInfo = saved;

      wx.hideLoading();
      this.setData({ submitting: false });
      wx.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => this.goBack(), 700);
    }).catch((err) => {
      if (err === 'blocked') return;
      wx.hideLoading();
      this.setData({ submitting: false });
      wx.showToast({ title: '保存失败,请重试', icon: 'none' });
    });
  }
});
