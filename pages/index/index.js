/**
 * ============================================================================
 * LLS俱乐部 - 首页(迭代版本)
 * ----------------------------------------------------------------------------
 * 【AI 后端锚点】写后端时优先看本注释,定位需对接的位置
 * ============================================================================
 * 1. 数据(data) - 需后端提供
 *   • announcement     : 平台公告文本              ← GET /api/announcement
 *   • gameBanners[]    : 游戏海报轮播(8款)         ← GET /api/banner/games
 *   • playerList[]     : 护航员列表(热门推荐)       ← GET /api/players
 *   • followList[]     : 关注的护航员               ← GET /api/players?following=1
 *   • guides[]         : 四大保障                  ← 可选 GET /api/guides
 *   • promoText        : 陪玩推广滚动字幕            ← GET /api/promo/play
 *   • sortOptions/...: 筛选下拉(可硬编码)
 *
 * 2. 关键函数 - 需替换为 wx.request
 *   • loadPlayers()    : 拉取护航员列表             ← /api/players
 *   • onSwiperChange() : 轮播索引(可埋点上报)       ← POST /api/track
 *   • onBannerTap(e)   : 携带 game.id 跳转          ← 后端可按 game 过滤
 *
 * 3. 跳转路由
 *   • gotoSearch()      → /homePages/search/search
 *   • gotoMessage()     → /pages/preferred/preferred (tab)
 *   • gotoAbout()       → /homePages/about/about
 *   • gotoPlayer(e)     → /circlePages/blogger_other/blogger_other?id=...
 *   • gotoCompanionPlay()→ 同上 + category=pei&from=promo
 * ============================================================================
 */
const app = getApp();
const api = require('../../utils/api.js');

Page({
  data: {
    statusBarHeight: 20,
    announcement: '',
    // 陪玩推广滚动字幕(在公告下方独立展示)
    promoText: '🔥 限时优惠 · 王者荣耀陪玩低至 5元/局 · 和平精英护航上分 100% 胜率 · LOL / 无畏契约 / CSGO 顶级声优 · 24h在线秒接单 · 新用户首单立减 10元',

    // 四大保障(保留兼容旧代码)
    guides: [
      { icon: '👤', text: '实名认证', cls: 'g-orange' },
      { icon: '🛡', text: '平台保障', cls: 'g-green' },
      { icon: '🔌', text: '专属接线', cls: 'g-purple' },
      { icon: '📄', text: '服务过程监控', cls: 'g-red' }
    ],

    // 热门游戏海报(自动轮播)
    // gradient / icon / corner 用于无图时的视觉呈现
    // 若需要真实海报:在 data 里加 cover: 'https://...' 字段即可,WXML 已支持 cover 覆盖
    gameBanners: [
      {
        id: 'hpjy',
        name: '和平精英',
        subtitle: '战术竞技 · 大吉大利今晚吃鸡',
        tag: '热门',
        hot: 'TOP1',
        icon: '🪂',
        corner: 'GAME FOR PEACE',
        gradient: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 55%, #b53618 100%)'
      },
      {
        id: 'lol',
        name: '英雄联盟',
        subtitle: '5v5 公平竞技 · 全球同服',
        tag: '推荐',
        hot: 'S15',
        icon: '⚔️',
        corner: 'LEAGUE OF LEGENDS',
        gradient: 'linear-gradient(135deg, #1e3a8a 0%, #c8aa6e 60%, #785a28 100%)'
      },
      {
        id: 'csgo',
        name: 'CS:GO',
        subtitle: '经典射击 · 全球巅峰对决',
        tag: '热门',
        icon: '💥',
        corner: 'COUNTER-STRIKE',
        gradient: 'linear-gradient(135deg, #f5a623 0%, #c08e2f 55%, #6b4a14 100%)'
      },
      {
        id: 'pubg',
        name: 'PUBG',
        subtitle: '百人吃鸡 · 大逃杀经典',
        tag: '推荐',
        icon: '🎯',
        corner: 'PLAYERUNKNOWN',
        gradient: 'linear-gradient(135deg, #ffb627 0%, #f47b25 55%, #a8420d 100%)'
      },
      {
        id: 'vwq',
        name: '无畏契约',
        subtitle: '5v5 战术射击 · 新一代FPS',
        tag: '新游',
        hot: 'NEW',
        icon: '🎯',
        corner: 'VALORANT',
        gradient: 'linear-gradient(135deg, #ff4655 0%, #53212b 55%, #1a0f0f 100%)'
      },
      {
        id: 'sjz',
        name: '三角洲行动',
        subtitle: '硬核射击 · 真实战场体验',
        tag: '新游',
        hot: 'HOT',
        icon: '🚁',
        corner: 'DELTA FORCE',
        gradient: 'linear-gradient(135deg, #2a3855 0%, #0a1427 60%, #020616 100%)'
      },
      {
        id: 'wzry',
        name: '王者荣耀',
        subtitle: '国民级 5v5 MOBA',
        tag: '热门',
        icon: '👑',
        corner: 'HONOR OF KINGS',
        gradient: 'linear-gradient(135deg, #b89348 0%, #3a2818 55%, #1a0f08 100%)'
      },
      {
        id: 'yjwj',
        name: '永劫无间',
        subtitle: '武侠吃鸡 · 近身冷兵器',
        tag: '推荐',
        icon: '🗡',
        corner: 'NARAKA',
        gradient: 'linear-gradient(135deg, #8b0000 0%, #3a0000 55%, #0a0000 100%)'
      }
    ],
    swiperIndex: 0,

    // 主 tab
    tabActive: 0,

    // 筛选
    dropdown: '',
    dropdownList: [],
    dropdownValue: '',
    sortText: '综合排序',
    genderText: '不限性别',
    serviceText: '服务类别',
    sortOptions: [
      { id: 'zh', text: '综合排序' },
      { id: 'score', text: '评分最高' },
      { id: 'order', text: '接单最多' },
      { id: 'new', text: '最新入驻' }
    ],
    genderOptions: [
      { id: 'all', text: '不限性别' },
      { id: 'm', text: '男生' },
      { id: 'f', text: '女生' }
    ],
    serviceOptions: [
      { id: 'all', text: '服务类别' },
      { id: 'hu', text: '护航单' },
      { id: 'pei', text: '陪练单' },
      { id: 'pai', text: '派单' }
    ],

    playerList: [],
    followList: []
  },

  onLoad() {
    const g = app.globalData;
    this.setData({
      statusBarHeight: g.statusBarHeight,
      announcement: g.announcement
    });
    this.loadPlayers();
    this.loadFollow();
  },

  onPullDownRefresh() {
    this.loadPlayers(() => this.loadFollow(() => wx.stopPullDownRefresh()));
  },

  /**
   * 性别归一化:把历史/异构数据统一成 'm' | 'f'
   * 兼容:数字(0未知/1男/2女,GB/T 2261.1)、'男'/'女'、'male'/'female'、'小哥哥'/'小姐姐'
   */
  normGender(v) {
    const s = String(v == null ? '' : v).trim().toLowerCase();
    if (s === 'f' || s === '2' || s === 'female' || s === '女' || s === '小姐姐') return 'f';
    return 'm';
  },

  /** 注册用户 → 卡片字段 */
  mapUserCard(u) {
    return {
      id: u.id || u.openid,
      openid: u.openid || '',
      isUser: true,
      name: u.nickname || '用户',
      avatar: u.avatar || '',
      avatarText: (u.nickname || 'U').slice(0, 1).toUpperCase(),
      sub: u.signature || ('来自' + (u.city || '地球') + '的玩家'),
      ribbon: u.followed ? '已关注' : '用户',
      gender: this.normGender(u.gender),
      fansCount: u.fansCount || 0,
      followed: !!u.followed
    };
  },

  /** 护航员 → 卡片字段 */
  mapPlayerCard(p) {
    return Object.assign({}, p, {
      isUser: false,
      sub: p.skillIntro || p.sub || '',
      ribbon: p.badge || p.ribbon || '护航',
      gender: this.normGender(p.gender),
      fansCount: p.fansCount || p.fans || 0
    });
  },

  /**
   * 热门推荐列表(本地演示数据)：
   * 注册用户榜(按粉丝数降序) + 护航员，合并后统一按所选排序展示
   */
  loadPlayers(done) {
    // 服务类别下拉筛选：把选中的类别(hu/pei/pai)传给后端按 category 过滤(仅护航员有类别)
    const svc = this.data.serviceOptions.find((it) => it.text === this.data.serviceText);
    const category = (svc && svc.id && svc.id !== 'all') ? svc.id : '';
    const g = this.data.genderOptions.find((it) => it.text === this.data.genderText);
    const gender = (g && g.id && g.id !== 'all') ? g.id : '';
    const s = this.data.sortOptions.find((it) => it.text === this.data.sortText);
    const sortId = (s && s.id) || 'zh';

    Promise.all([
      api.hotUsers({ gender: gender, limit: 20 }),
      api.playerList(category ? { category: category } : {})
    ]).then((res) => {
      let userCards = (res[0] || []).map((u) => this.mapUserCard(u));
      let playerCards = (res[1] || []).map((p) => this.mapPlayerCard(p));
      // 性别筛选(注册用户 + 护航员都支持)
      if (gender) {
        userCards = userCards.filter((it) => it.gender === gender);
        playerCards = playerCards.filter((it) => it.gender === gender);
      }
      // 排序:综合/最新按关注数,评分/接单按护航员业务字段
      const fieldMap = { zh: 'fansCount', score: 'score', order: 'orders', new: 'fansCount' };
      const field = fieldMap[sortId] || 'fansCount';
      const arr = userCards.concat(playerCards).sort((a, b) => {
        const av = Number(a[field]) || 0;
        const bv = Number(b[field]) || 0;
        return bv - av;
      });
      this.setData({ playerList: arr });
      done && done();
    }).catch(() => {
      done && done();
    });
  },

  /** 我的关注列表(真实关注数据:注册用户 + 护航员) */
  loadFollow(done) {
    Promise.all([api.followedUsers(), api.followList()]).then((res) => {
      const userCards = (res[0] || []).map((u) => this.mapUserCard(u));
      const playerCards = (res[1] || []).map((p) => this.mapPlayerCard(Object.assign({ followed: true }, p)));
      const arr = userCards.concat(playerCards).sort((a, b) => (b.fansCount || 0) - (a.fansCount || 0));
      this.setData({ followList: arr });
      done && done();
    }).catch(() => {
      done && done();
    });
  },

  getCurrentOptions(key) {
    if (key === 'sort') return { list: this.data.sortOptions, value: this.data.sortText };
    if (key === 'gender') return { list: this.data.genderOptions, value: this.data.genderText };
    return { list: this.data.serviceOptions, value: this.data.serviceText };
  },

  toggleDropdown(e) {
    const key = e.currentTarget.dataset.dropdown;
    if (this.data.dropdown === key) {
      this.setData({ dropdown: '' });
      return;
    }
    const cur = this.getCurrentOptions(key);
    const map = { sort: 'sortText', gender: 'genderText', service: 'serviceText' };
    const value = cur.list.find((it) => it.text === this.data[map[key]]);
    this.setData({
      dropdown: key,
      dropdownList: cur.list,
      dropdownValue: value ? value.id : ''
    });
  },

  pickDropdown(e) {
    const { id, text } = e.currentTarget.dataset;
    const key = this.data.dropdown;
    if (key === 'sort') this.setData({ sortText: text });
    if (key === 'gender') this.setData({ genderText: text });
    if (key === 'service') this.setData({ serviceText: text });
    this.setData({ dropdown: '' });
    this.loadPlayers();
  },

  closeDropdown() {
    this.setData({ dropdown: '' });
  },

  chooseTab(e) {
    const idx = Number(e.currentTarget.dataset.index);
    this.setData({ tabActive: idx });
    // 切到「我的关注」时刷新关注列表(关注/取关后回来保持最新)
    if (idx === 1) this.loadFollow();
  },

  showPop() {
    wx.showModal({
      title: '平台公告',
      content: this.data.announcement,
      showCancel: false,
      confirmColor: '#00e5ff'
    });
  },

  gotoSearch() {
    wx.navigateTo({ url: '/homePages/search/search' });
  },

  gotoMessage() {
    wx.switchTab({ url: '/pages/preferred/preferred' });
  },

  gotoAbout() {
    wx.navigateTo({ url: '/homePages/about/about' });
  },

  gotoPlayer(e) {
    // 注册用户暂无独立主页,先提示;护航员跳转主页
    if (e.currentTarget.dataset.isuser) {
      wx.showToast({ title: '个人主页即将开放,先关注吧~', icon: 'none' });
      return;
    }
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/circlePages/blogger_other/blogger_other?id=' + id });
  },

  /** 关注/取关注册用户(热门推荐卡片,乐观更新) */
  onFollowUser(e) {
    const idx = e.currentTarget.dataset.index;
    const item = this.data.playerList[idx];
    if (!item || !item.openid) return;
    if (item.openid === (app.globalData.openid || '')) {
      wx.showToast({ title: '不能关注自己哦', icon: 'none' });
      return;
    }
    const next = !item.followed;
    const fans = Math.max(0, (item.fansCount || 0) + (next ? 1 : -1));
    this.setData({
      ['playerList[' + idx + '].followed']: next,
      ['playerList[' + idx + '].fansCount']: fans,
      ['playerList[' + idx + '].ribbon']: next ? '已关注' : '用户'
    });
    api.followUser(item.openid).then((r) => {
      // 以服务端返回为准修正
      if (r && typeof r.fansCount === 'number') {
        this.setData({ ['playerList[' + idx + '].fansCount']: r.fansCount });
      }
    }).catch(() => {
      // 失败回滚
      this.setData({
        ['playerList[' + idx + '].followed']: item.followed,
        ['playerList[' + idx + '].fansCount']: item.fansCount || 0,
        ['playerList[' + idx + '].ribbon']: item.followed ? '已关注' : '用户'
      });
      wx.showToast({ title: '操作失败,请重试', icon: 'none' });
    });
  },

  /** 轮播切换:记录当前索引(可用于埋点/联动) */
  onSwiperChange(e) {
    this.setData({ swiperIndex: e.detail.current });
  },

  /** 点击游戏海报:按游戏 id 跳转对应护航分类(暂无则跳转护航员列表) */
  onBannerTap(e) {
    const game = e.currentTarget.dataset.game;
    if (!game || !game.id) return;
    // 携带游戏 id 跳转,后续承接页可读取 gameId 过滤护航员
    wx.navigateTo({
      url: '/circlePages/blogger_other/blogger_other?gameId=' + game.id + '&from=banner'
    });
  },

  /** 点击陪玩推广条:跳转到陪玩分类列表 */
  gotoCompanionPlay() {
    wx.navigateTo({
      url: '/circlePages/blogger_other/blogger_other?category=pei&from=promo'
    });
  }
});
