/**
 * ============================================================================
 * LLS俱乐部 - 发布动态(迭代版本 · 王者式敏感词)
 * ----------------------------------------------------------------------------
 * 【AI 后端锚点】写后端时优先看本注释,定位需对接的位置
 * ============================================================================
 * 1. 数据(data)
 *   • content       : 动态正文(前端输入,最多 maxLen)
 *   • images[]      : 已选本地图片临时路径(最多 maxImg 张)
 *   • tagList[]     : 话题标签候选(可后端下发)     ← 可选 GET /api/topics
 *   • tagActive     : 选中的标签下标, -1 表示未选
 *   • scanLevel     : 实时检测结果 'ok'|'mask'|'ad'|'block'(驱动提示条颜色)
 *   • scanTip       : 实时提示文案
 *
 * 2. 关键函数
 *   • onContentInput() : 边输入边调用 security.scan() 实时预警
 *   • chooseImage()    : wx.chooseMedia 选择图片
 *   • onSubmit()       : ① security.guard() 同步守卫(发言CD + 分级敏感词)
 *                        → ② security.checkFields 官方文本复核
 *                        → ③ 上传图片 ④ checkImages 官方图片复核
 *                        → ⑤ 提交                       ← POST /api/feeds
 *
 * 3. 内容安全(王者荣耀式)
 *   • block 级 → 禁止发送;mask/ad 级 → 自动屏蔽为 * 后发送
 *   • 发言冷却 10s(防刷屏),发送成功 security.markRate('feed')
 *   • 统一封装 /utils/security.js
 *
 * 4. 跳转路由
 *   • goBack()      → wx.navigateBack() (上级: 广场)
 * ============================================================================
 */
const app = getApp();
const security = require('../../utils/security.js');
const api = require('../../utils/api.js');

const FEED_CD = 10; // 发言冷却秒数(防刷屏)

Page({
  data: {
    statusBarHeight: 20,
    content: '',
    maxLen: 500,
    tagList: ['组队开黑', '上分攻略', '陪玩日常', '赛事资讯', '玩家交流'],
    tagActive: -1,
    scanLevel: 'ok',
    scanTip: '',
    submitting: false
  },

  onLoad() {
    this.setData({
      statusBarHeight: (app.globalData && app.globalData.statusBarHeight) || 20
    });
  },

  goBack() {
    wx.navigateBack({ delta: 1, fail: () => wx.switchTab({ url: '/pages/activity/activity' }) });
  },

  /** 边输入边实时检测(王者式即时预警) */
  onContentInput(e) {
    const value = e.detail.value || '';
    const s = security.scan(value);
    this.setData({
      content: value,
      scanLevel: s.level,
      scanTip: s.message
    });
  },

  chooseTag(e) {
    const idx = Number(e.currentTarget.dataset.index);
    this.setData({ tagActive: this.data.tagActive === idx ? -1 : idx });
  },

  /* ---------- 发布 ---------- */
  onSubmit() {
    if (this.data.submitting) return;

    const raw = (this.data.content || '').trim();
    if (!raw) {
      wx.showToast({ title: '请输入内容', icon: 'none' });
      return;
    }
    if (raw.length > this.data.maxLen) {
      wx.showToast({ title: `最多${this.data.maxLen}字`, icon: 'none' });
      return;
    }

    // ① 同步守卫:发言冷却(防刷屏) + 三级敏感词(王者式,立即反馈)
    const g = security.guard(raw, { key: 'feed', cd: FEED_CD });
    if (!g.ok) {
      if (g.level === 'rate') {
        wx.showToast({ title: g.message, icon: 'none' });
      } else {
        security.toastByReason(g);
      }
      return;
    }

    // mask / ad 级:使用自动屏蔽后的文本发送
    const content = g.masked;
    if (g.level === 'mask' || g.level === 'ad') {
      this.setData({ content: content, scanLevel: g.level, scanTip: g.message });
      if (!content) {
        wx.showToast({ title: '内容均为敏感词,请修改', icon: 'none' });
        return;
      }
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: '内容检测中...', mask: true });

    // ② 内容二次复核(本地词库检测；接入自建后端后为服务端检测)
    security.checkFields([
      { name: '动态内容', value: content, scene: security.SCENE.FORUM },
      { name: '话题标签', value: this.data.tagActive > -1 ? this.data.tagList[this.data.tagActive] : '' }
    ]).then((textRes) => {
      if (!textRes.pass) {
        wx.hideLoading();
        this.setData({ submitting: false });
        security.toastByReason(textRes.item);
        return Promise.reject('blocked');
      }
      const user = app.globalData.userInfo || {};
      // ③ 提交发布(本地演示数据)
      return api.publishFeed({
        name: user.nickname || '我',
        avatarText: '我',
        avatar: user.avatar || '',
        gender: 'm',
        city: '本地',
        content: content,
        images: [],
        cover: false,
        coverText: '',
        tag: this.data.tagActive > -1 ? this.data.tagList[this.data.tagActive] : ''
      });
    }).then(() => {
      // 记录发言时间,开始冷却计时(防刷屏)
      security.markRate('feed');

      wx.hideLoading();
      this.setData({ submitting: false, scanLevel: 'ok', scanTip: '' });
      wx.showToast({ title: '发布成功', icon: 'success' });
      setTimeout(() => this.goBack(), 700);
    }).catch((err) => {
      if (err === 'blocked') return;
      wx.hideLoading();
      this.setData({ submitting: false });
      wx.showToast({ title: '发布失败,请重试', icon: 'none' });
    });
  },

  formatTime() {
    const d = new Date();
    const p = n => (n < 10 ? '0' + n : '' + n);
    return p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
});