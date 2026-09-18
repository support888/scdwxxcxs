/**
 * ============================================================================
 * LLS俱乐部 - 本地演示数据 + 离线兜底
 * ----------------------------------------------------------------------------
 * 作用：
 *   • 页面依靠本文件渲染、交互(点赞/评论/浏览/关注)写入本地缓存
 *   • 接入自建后端后，仅需替换 utils/api.js 内部实现，本文件即可废弃
 * 数据集合命名(与原云开发集合一致，便于后续迁移)：
 *   lls_players / lls_player_reviews / lls_feeds / lls_feed_comments
 *   lls_users / lls_user_settings / lls_coupons / lls_income_logs
 * ============================================================================
 */

const FEED_META_KEY = 'lls_feed_meta_v1';     // { [feedId]: {views,likes,liked,comments} }
const COMMENT_KEY = 'lls_feed_comments_v1';   // { [feedId]: [comment] }
const PLAYER_KEY = 'lls_player_local_v1';     // { [playerId]: {followed,fansCount} }
const LOCAL_FEEDS_KEY = 'lls_feeds';          // 发布页写入的动态(沿用旧 key)
const PROFILE_KEY = 'lls_user';               // 账户与资料(沿用登录写入的 key)
const SETTINGS_KEY = 'lls_settings_v1';       // 设置页开关
const COUPON_KEY = 'lls_coupons_v1';          // 我的优惠券

/* -------------------------- 工具 -------------------------- */
function read(key, def) {
  try {
    const v = wx.getStorageSync(key);
    return v || def;
  } catch (e) { return def; }
}
function write(key, v) {
  try { wx.setStorageSync(key, v); } catch (e) { /* ignore */ }
}
function pad(n) { return n < 10 ? '0' + n : '' + n; }
function formatTime(ts) {
  const d = ts ? new Date(ts) : new Date();
  return pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

/* -------------------------- 护航员(用户展示页) -------------------------- */
const demoPlayers = [
  {
    id: '1',
    category: 'hu',
    name: '英雄联盟-上分护航',
    avatarText: '英',
    avatar: '',
    cover: '',
    coverCorner: 'LEAGUE OF LEGENDS',
    gender: 'm',
    rank: '神话',
    level: '官方账号认证',
    idTag: 'ID: 2465',
    city: '东莞市',
    age: 20,
    zodiac: '摩羯座',
    job: '未设置',
    wealth: 0,
    charm: 66,
    score: '5.0',
    orders: 28,
    followCount: 5,
    fansCount: 11,
    likeCount: 21,
    signature: '这个用户很懒，什么也没留下...',
    skillIntro: '技术官方客服',
    badge: '日常派单',
    tags: ['护航', '陪玩', 'PC'],
    personalityTags: ['实名认证', '交易保障机制', '爽约换队', '极速服务'],
    skillTags: ['日常派单', '极速派单', '限时派单'],
    services: [
      { name: '日常派单', status: '可咨询' },
      { name: '极速派单', status: '可咨询' },
      { name: '限时派单', status: '可咨询' }
    ],
    skills: [
      { game: '英雄联盟', icon: '⚔', price: 110, unit: '局', online: true },
      { game: '英雄联盟(手游)', icon: '📱', price: 120, unit: '小时', online: true },
      { game: '无畏契约', icon: '🎯', price: 88, unit: '局', online: true },
      { game: '王者荣耀', icon: '👑', price: 0, unit: '面议', online: false }
    ],
    followed: false
  },
  {
    id: '2',
    category: 'hu',
    name: '无畏契约-上分护航',
    avatarText: '无',
    avatar: '',
    coverCorner: 'VALORANT',
    gender: 'm',
    rank: '王牌',
    level: '实名认证',
    idTag: 'ID: 3121',
    city: '广州市',
    age: 22,
    zodiac: '狮子座',
    job: '自由职业',
    wealth: 120,
    charm: 88,
    score: '5.0',
    orders: 15,
    followCount: 12,
    fansCount: 34,
    likeCount: 56,
    signature: '不朽段位战队，主玩决斗者，稳定上分。',
    skillIntro: '射击游戏专精，段位不朽',
    badge: '极速派单',
    tags: ['护航', '上分', 'FPS'],
    personalityTags: ['实名认证', '极速服务', '全程语音'],
    skillTags: ['极速派单', '日常派单'],
    services: [
      { name: '极速派单', status: '可咨询' },
      { name: '日常派单', status: '可咨询' }
    ],
    skills: [
      { game: '无畏契约', icon: '🎯', price: 99, unit: '局', online: true },
      { game: 'CS:GO', icon: '💥', price: 88, unit: '局', online: true }
    ],
    followed: false
  },
  {
    id: '3',
    category: 'pai',
    name: '三角洲行动-上分护航',
    avatarText: '三',
    avatar: '',
    coverCorner: 'DELTA FORCE',
    gender: 'm',
    rank: '神话',
    level: '平台认证',
    idTag: 'ID: 2088',
    city: '深圳市',
    age: 25,
    zodiac: '天蝎座',
    job: '电竞教练',
    wealth: 300,
    charm: 45,
    score: '5.0',
    orders: 8,
    followCount: 3,
    fansCount: 9,
    likeCount: 12,
    signature: '硬核战场老兵，带你稳健搜打撤。',
    skillIntro: '战术指挥，擅长高难度地图',
    badge: '限时派单',
    tags: ['护航', '硬核'],
    personalityTags: ['实名认证', '爽约换队'],
    skillTags: ['限时派单', '极速派单'],
    services: [
      { name: '限时派单', status: '可咨询' },
      { name: '极速派单', status: '可咨询' }
    ],
    skills: [
      { game: '三角洲行动', icon: '🚁', price: 130, unit: '小时', online: true },
      { game: '暗区端游', icon: '🖥', price: 110, unit: '局', online: true }
    ],
    followed: false
  },
  {
    id: '4',
    category: 'hu',
    name: '王者荣耀-上分护航',
    avatarText: '王',
    avatar: '',
    coverCorner: 'HONOR OF KINGS',
    gender: 'm',
    rank: '神话',
    level: '官方账号认证',
    idTag: 'ID: 4092',
    city: '东莞市',
    age: 21,
    zodiac: '双鱼座',
    job: '主播',
    wealth: 888,
    charm: 156,
    score: '5.0',
    orders: 36,
    followCount: 20,
    fansCount: 120,
    likeCount: 230,
    signature: '王者百星战队，全位置可打，轻松带飞。',
    skillIntro: '百星王者，国服打野教学',
    badge: '日常派单',
    tags: ['护航', '陪玩', '上分'],
    personalityTags: ['实名认证', '交易保障机制', '极速服务', '爽约换队'],
    skillTags: ['日常派单', '极速派单', '限时派单'],
    services: [
      { name: '日常派单', status: '可咨询' },
      { name: '极速派单', status: '可咨询' },
      { name: '限时派单', status: '可咨询' }
    ],
    skills: [
      { game: '王者荣耀', icon: '👑', price: 60, unit: '局', online: true },
      { game: '英雄联盟', icon: '⚔', price: 88, unit: '局', online: true }
    ],
    followed: false
  },
  {
    id: '5',
    category: 'pei',
    name: '和平精英-陪玩小姐姐',
    avatarText: '和',
    avatar: '',
    coverCorner: 'GAME FOR PEACE',
    gender: 'f',
    rank: '王牌',
    level: '实名认证',
    idTag: 'ID: 5610',
    city: '上海市',
    age: 23,
    zodiac: '天秤座',
    job: '自由职业',
    wealth: 560,
    charm: 320,
    score: '4.9',
    orders: 52,
    followCount: 30,
    fansCount: 260,
    likeCount: 680,
    signature: '声音甜美，段位无敌战神，全程语音陪你吃鸡~',
    skillIntro: '温柔陪玩，擅长带动气氛',
    badge: '陪玩单',
    tags: ['陪玩', '语音', '吃鸡'],
    personalityTags: ['实名认证', '极速服务', '全程语音'],
    skillTags: ['陪玩单', '日常派单'],
    services: [
      { name: '陪玩单', status: '可咨询' },
      { name: '日常派单', status: '可咨询' }
    ],
    skills: [
      { game: '和平精英', icon: '🪂', price: 70, unit: '局', online: true },
      { game: '王者荣耀', icon: '👑', price: 50, unit: '局', online: true }
    ],
    followed: false
  }
];

/* 评价(按护航员 id 分组) */
const seedReviews = {
  '1': [
    { id: 'r1', name: '路人甲', avatarText: '路', score: 5, content: '技术官方客服很专业，派单速度快，全程有跟进。', time: '09-10 21:30', tags: ['服务态度好', '响应快'] },
    { id: 'r2', name: '夜风', avatarText: '夜', score: 5, content: '交易走平台很安心，爽约换队机制到位。', time: '09-08 19:02', tags: ['有保障'] }
  ]
};

/* 动态墙(按护航员 id 分组) */
const seedPlayerFeeds = {
  '1': [
    {
      id: 'pf1',
      name: '英雄联盟-上分护航',
      avatarText: '英',
      gender: 'm',
      time: '02-09 19:02',
      city: '衡阳市',
      content: '今晚德玛西亚双排发车，钻石局稳上分，需要的兄弟评论区扣 1 ~',
      cover: false,
      coverText: '',
      tag: '组队开黑',
      views: 320,
      likes: 21,
      comments: 3
    },
    {
      id: 'pf1b',
      name: '英雄联盟-上分护航',
      avatarText: '英',
      gender: 'm',
      time: '09-16 21:10',
      city: '东莞市',
      content: '今晚艾欧尼亚双排发车，钻石局稳上分，需要的兄弟评论区扣 1 ~',
      cover: false,
      coverText: '',
      tag: '组队开黑',
      views: 88,
      likes: 12,
      comments: 2
    }
  ],
  '2': [
    {
      id: 'pf2',
      name: '无畏契约-上分护航',
      avatarText: '无',
      gender: 'm',
      time: '09-17 18:40',
      city: '广州市',
      content: '不朽段位车队招决斗者一名，全程语音指挥，今晚 8 点开打，速来 ~',
      cover: false,
      coverText: '',
      tag: '组队开黑',
      views: 120,
      likes: 18,
      comments: 4
    }
  ],
  '3': [
    {
      id: 'pf3',
      name: '三角洲行动-上分护航',
      avatarText: '三',
      gender: 'm',
      time: '09-15 22:05',
      city: '深圳市',
      content: '硬核局带撤教学，教你搜打撤思路，明晚直播开团，欢迎围观 ~',
      cover: false,
      coverText: '',
      tag: '实战教学',
      views: 76,
      likes: 9,
      comments: 1
    }
  ],
  '4': [
    {
      id: 'pf4',
      name: '王者荣耀-上分护航',
      avatarText: '王',
      gender: 'm',
      time: '09-18 12:30',
      city: '东莞市',
      content: '百星车队 5 排差 2 人，国服打野全程带飞，妹子优先，直接上车 ~',
      cover: false,
      coverText: '',
      tag: '组队开黑',
      views: 210,
      likes: 45,
      comments: 8
    }
  ],
  '5': [
    {
      id: 'pf5',
      name: '和平精英-陪玩小姐姐',
      avatarText: '和',
      gender: 'f',
      time: '09-18 20:00',
      city: '上海市',
      content: '今晚吃鸡车队发车啦~ 无敌战神带你落地成盒变落地成神，全程语音陪聊 🎮',
      cover: false,
      coverText: '',
      tag: '陪玩上车',
      views: 320,
      likes: 66,
      comments: 12
    }
  ]
};

/* -------------------------- 广场动态 -------------------------- */
const demoFeeds = [
  {
    id: 'f1',
    name: '糖糖不甜',
    avatarText: '糖',
    avatar: '',
    gender: 'f',
    time: '09-18 22:10',
    city: '广州市',
    content: '🌸 王者荣耀 5排车队差 2 人！本人百星中单 + 国服辅助在线等，妹子优先，全程语音轻松上分~ 速来报名 🎮',
    cover: false,
    coverText: '',
    tag: '组队开黑',
    views: 156,
    comments: 12,
    likes: 38,
    liked: false
  },
  {
    id: 'f2',
    name: '野王阿杰',
    avatarText: '杰',
    avatar: '',
    gender: 'm',
    time: '09-18 20:35',
    city: '上海市',
    content: '⚔️ 英雄联盟双排车队发车！艾欧尼亚钻石局，本人专精打野 + 友方 AD，全程语音开黑上分~ 寻中单/上单搭子',
    cover: false,
    coverText: '',
    tag: '组队开黑',
    views: 98,
    comments: 8,
    likes: 24,
    liked: false
  },
  {
    id: 'f3',
    name: '青枫',
    avatarText: '青',
    avatar: '',
    gender: 'f',
    time: '09-15 20:31',
    city: '上海市',
    content: '今晚八点王者双排车队发车啦！上分搭子速来报名，轻松上大分~ 🎮',
    cover: false,
    coverText: '',
    tag: '组队开黑',
    views: 89,
    comments: 6,
    likes: 23,
    liked: false
  }
];

/* 预置评论 */
const seedComments = {
  f1: [
    { id: 'c1', name: '小草莓', avatarText: '草', content: '求带带！我辅助可以~', time: '09-18 22:20', likes: 2 },
    { id: 'c2', name: '大魔王', avatarText: '魔', content: '中单已就位，私信发ID了', time: '09-18 22:31', likes: 0 }
  ],
  f2: [
    { id: 'c3', name: '阿萨辛', avatarText: '阿', content: '打野带我上分，我上单稳', time: '09-18 20:50', likes: 1 }
  ]
};

/* -------------------------- 本地元数据(浏览/点赞/评论数) -------------------------- */
function getMetaMap() { return read(FEED_META_KEY, {}); }
function setMetaMap(m) { write(FEED_META_KEY, m); }

function ensureMeta(id, base) {
  const map = getMetaMap();
  const k = String(id);
  if (!map[k]) {
    map[k] = {
      views: (base && base.views) || 0,
      likes: (base && base.likes) || 0,
      liked: !!(base && base.liked),
      comments: (base && base.comments) || 0
    };
    setMetaMap(map);
  }
  return map[k];
}
function patchMeta(id, patch) {
  const map = getMetaMap();
  const k = String(id);
  map[k] = Object.assign({}, map[k] || {}, patch);
  setMetaMap(map);
  return map[k];
}

/* -------------------------- 动态:读取 -------------------------- */
function allFeeds() {
  const local = read(LOCAL_FEEDS_KEY, []);
  return (local || []).concat(demoFeeds);
}

function findFeed(id) {
  const list = allFeeds();
  for (let i = 0; i < list.length; i++) {
    if (String(list[i].id) === String(id)) return list[i];
  }
  // 关注页/动态墙的帖子(按护航员分组的动态)
  for (const pid in seedPlayerFeeds) {
    const wall = seedPlayerFeeds[pid] || [];
    for (let j = 0; j < wall.length; j++) {
      if (String(wall[j].id) === String(id)) return wall[j];
    }
  }
  return null;
}

function applyMeta(feed) {
  const m = ensureMeta(metaKeyFor(feed.id, feed), feed);
  return Object.assign({}, feed, {
    views: m.views,
    likes: m.likes,
    liked: m.liked,
    comments: m.comments
  });
}

/** 动态墙的帖子用 p_ 前缀元数据，与 playerFeeds/followFeeds 统计保持一致 */
function isWallFeed(id) {
  for (const pid in seedPlayerFeeds) {
    const wall = seedPlayerFeeds[pid] || [];
    for (let j = 0; j < wall.length; j++) {
      if (String(wall[j].id) === String(id)) return true;
    }
  }
  return false;
}
function metaKeyFor(id, feed) {
  return isWallFeed(id) ? 'p_' + id : String(id);
}

function feedList(params) {
  params = params || {};
  const cate = params.category || '最新';
  let list = allFeeds().map(applyMeta);
  if (cate === '点赞') list.sort(function (a, b) { return b.likes - a.likes; });
  else if (cate === '热评') list.sort(function (a, b) { return b.comments - a.comments; });
  else if (cate === '人气') list.sort(function (a, b) { return b.views - a.views; });
  else if (cate === '推荐') list.sort(function (a, b) { return (b.likes + b.views) - (a.likes + a.views); });
  return list;
}

function feedDetail(id) {
  const feed = findFeed(id);
  if (!feed) return null;
  const key = metaKeyFor(id, feed);
  const m = patchMeta(key, { views: (ensureMeta(key, feed).views || 0) + 1 });
  const detail = Object.assign({}, feed, { views: m.views, likes: m.likes, liked: m.liked, comments: m.comments });
  // 兜底:详情页 wxml 依赖 feed.images.length,旧数据/演示数据可能没有 images 字段,补成空数组避免渲染时 TypeError 导致闪退
  detail.images = Array.isArray(feed.images) ? feed.images : [];
  detail.commentList = commentList(id);
  return detail;
}

function addView(id) {
  const feed = findFeed(id) || {};
  const key = metaKeyFor(id, feed);
  const m = ensureMeta(key, feed);
  return patchMeta(key, { views: (m.views || 0) + 1 });
}

function toggleLike(id) {
  const feed = findFeed(id) || {};
  const key = metaKeyFor(id, feed);
  const m = ensureMeta(key, feed);
  const liked = !m.liked;
  const likes = Math.max(0, (m.likes || 0) + (liked ? 1 : -1));
  patchMeta(key, { liked: liked, likes: likes });
  return { liked: liked, likes: likes };
}

function commentList(id) {
  const map = read(COMMENT_KEY, {});
  const k = String(id);
  if (map[k]) return map[k];
  return (seedComments[k] || []).slice();
}

function addComment(id, content) {
  const map = read(COMMENT_KEY, {});
  const k = String(id);
  const list = map[k] || (seedComments[k] ? seedComments[k].slice() : []);
  const c = { id: 'c' + Date.now(), name: '我', avatarText: '我', content: content, time: formatTime(), likes: 0 };
  list.push(c);
  map[k] = list;
  write(COMMENT_KEY, map);
  const feed = findFeed(id) || {};
  const key = metaKeyFor(id, feed);
  const m = ensureMeta(key, feed);
  const updated = patchMeta(key, { comments: (m.comments || 0) + 1 });
  return { comment: c, comments: updated.comments };
}

function publishFeed(data) {
  data = data || {};
  const feed = Object.assign({
    id: Date.now(),
    name: '我',
    avatarText: '我',
    gender: 'm',
    time: formatTime(),
    city: '本地',
    content: '',
    cover: false,
    coverText: '',
    images: [],
    tag: '',
    views: 0,
    comments: 0,
    likes: 0,
    liked: false
  }, data);
  const list = read(LOCAL_FEEDS_KEY, []);
  list.unshift(feed);
  write(LOCAL_FEEDS_KEY, list);
  ensureMeta(feed.id, feed);
  return feed;
}

/* -------------------------- 护航员:读取/交互 -------------------------- */
function findPlayer(id) {
  for (let i = 0; i < demoPlayers.length; i++) {
    if (String(demoPlayers[i].id) === String(id)) return demoPlayers[i];
  }
  return null;
}

function playerList(params) {
  params = params || {};
  const locals = read(PLAYER_KEY, {});
  let list = demoPlayers.map(function (p) {
    return Object.assign({}, p, locals[p.id] || {});
  });
  const cate = params.category;
  if (cate && cate !== 'all') {
    // pei 兼容旧的 tag 过滤逻辑(陪玩)，其余按 category 字段过滤
    list = list.filter(function (p) {
      if (cate === 'pei') return (p.tags || []).indexOf('陪玩') > -1 || p.category === 'pei';
      return p.category === cate;
    });
  }
  return list;
}

function playerDetail(id) {
  const locals = read(PLAYER_KEY, {});
  let base = findPlayer(id);
  // 演示兜底：未收录的 id 复制首个模板，保证任意入口都能打开展示页
  if (!base) base = Object.assign({}, demoPlayers[0], { id: String(id || '1') });
  const local = locals[base.id] || {};
  const player = Object.assign({}, base, local);
  player.reviews = playerReviews(base.id);
  player.feeds = playerFeeds(base.id);
  return player;
}

function toggleFollow(id) {
  const locals = read(PLAYER_KEY, {});
  const base = findPlayer(id) || demoPlayers[0];
  const cur = Object.assign({ followed: false, fansCount: base.fansCount || 0 }, locals[id] || {});
  cur.followed = !cur.followed;
  cur.fansCount = Math.max(0, (cur.fansCount || 0) + (cur.followed ? 1 : -1));
  locals[id] = cur;
  write(PLAYER_KEY, locals);
  return { followed: cur.followed, fansCount: cur.fansCount };
}

function playerReviews(id) {
  return (seedReviews[String(id)] || []).slice();
}

function playerFeeds(id) {
  const locals = read(PLAYER_KEY, {});
  const list = (seedPlayerFeeds[String(id)] || []).slice();
  // 动态墙里的浏览/点赞跟随实时统计
  return list.map(function (f) {
    const m = ensureMeta('p_' + f.id, f);
    return Object.assign({}, f, { views: m.views, likes: m.likes, liked: m.liked });
  });
}

/* -------------------------- 关注(广场"关注"Tab) -------------------------- */
/** 我关注的护航员列表(本地读取 PLAYER_KEY 中的 followed 标记) */
function followList() {
  const locals = read(PLAYER_KEY, {});
  return demoPlayers
    .filter(function (p) { return locals[p.id] && locals[p.id].followed; })
    .map(function (p) { return Object.assign({}, p, locals[p.id] || {}); });
}

/** 关注的人发布的动态(关注页信息流) */
function followFeeds() {
  const followed = followList();
  const out = [];
  followed.forEach(function (p) {
    (seedPlayerFeeds[String(p.id)] || []).forEach(function (f) {
      const m = ensureMeta('p_' + f.id, f);
      out.push(Object.assign({}, f, {
        authorId: p.id,
        views: m.views,
        likes: m.likes,
        liked: m.liked,
        comments: m.comments || f.comments || 0
      }));
    });
  });
  // 最新在前
  return out;
}

/* -------------------------- 注册用户热门榜(首页"热门推荐") ---------------------- */
const USER_FOLLOW_KEY = 'lls_user_follows_v1';   // { [openid]: true }
const USER_FANS_KEY = 'lls_user_fans_v1';       // { [openid]: number }

/** 演示注册用户(本地演示数据) */
const demoUsers = [
  { openid: 'demo-u1', nickname: '夜刃', gender: 'f', city: '上海市', signature: '王者上分找我~', fansCount: 128 },
  { openid: 'demo-u2', nickname: '阿泽', gender: 'm', city: '成都市', signature: '三角洲老哥,带飞', fansCount: 96 },
  { openid: 'demo-u3', nickname: '小鹿不吃草', gender: 'f', city: '武汉市', signature: '陪玩小姐姐,声音甜', fansCount: 65 },
  { openid: 'demo-u4', nickname: 'RushB大师', gender: 'm', city: '深圳市', signature: '无畏契约 上分必胜', fansCount: 42 },
  { openid: 'demo-u5', nickname: '糖糖', gender: 'f', city: '北京市', signature: '佛系上分,快乐游戏', fansCount: 18 }
];

function hotUsers(params) {
  params = params || {};
  const follows = read(USER_FOLLOW_KEY, {});
  const fans = read(USER_FANS_KEY, {});
  let list = demoUsers.map(function (u) {
    return Object.assign({ id: u.openid, avatar: '', followed: !!follows[u.openid] }, u, {
      fansCount: fans[u.openid] !== undefined ? fans[u.openid] : u.fansCount
    });
  });
  if (params.gender && params.gender !== 'all') {
    list = list.filter(function (u) { return u.gender === params.gender; });
  }
  return list.sort(function (a, b) { return b.fansCount - a.fansCount; });
}

function followUser(targetOpenid) {
  const follows = read(USER_FOLLOW_KEY, {});
  const fans = read(USER_FANS_KEY, {});
  const demo = demoUsers.filter(function (u) { return u.openid === targetOpenid; })[0] || {};
  const base = fans[targetOpenid] !== undefined ? fans[targetOpenid] : (demo.fansCount || 0);
  const followed = !follows[targetOpenid];
  follows[targetOpenid] = followed ? true : false;
  if (!followed) delete follows[targetOpenid];
  fans[targetOpenid] = Math.max(0, base + (followed ? 1 : -1));
  write(USER_FOLLOW_KEY, follows);
  write(USER_FANS_KEY, fans);
  return { followed: followed, fansCount: fans[targetOpenid] };
}

function followedUsers() {
  const follows = read(USER_FOLLOW_KEY, {});
  const fans = read(USER_FANS_KEY, {});
  return demoUsers
    .filter(function (u) { return follows[u.openid]; })
    .map(function (u) {
      return Object.assign({ id: u.openid, avatar: '', followed: true }, u, {
        fansCount: fans[u.openid] !== undefined ? fans[u.openid] : u.fansCount
      });
    });
}

/** 搜索注册用户(昵称模糊匹配 / openid 精确及前缀匹配 / 本地账号)
 *  返回数组中,isMe=true 项代表当前登录用户本身(openid='me') */
function searchUsers(keyword) {
  const kw = String(keyword || '').trim().toLowerCase();
  if (!kw) return [];
  const follows = read(USER_FOLLOW_KEY, {});
  const fans = read(USER_FANS_KEY, {});
  const meOpenid = 'me';
  const result = [];

  // ① 演示用户
  demoUsers.forEach(function (u) {
    const nick = String(u.nickname || '').toLowerCase();
    const oid = String(u.openid || '').toLowerCase();
    if (nick.indexOf(kw) > -1 || oid === kw || oid.indexOf(kw) === 0) {
      result.push(Object.assign({ id: u.openid, openid: u.openid, isMe: false, avatar: '', followed: !!follows[u.openid], shortId: u.openid.slice(-6) }, u, {
        fansCount: fans[u.openid] !== undefined ? fans[u.openid] : u.fansCount
      }));
    }
  });

  // ② 当前登录用户(本地 profile),昵称/手机号命中则并入结果
  try {
    const profile = read(PROFILE_KEY, null);
    if (profile && profile.nickname) {
      const nick = String(profile.nickname || '').toLowerCase();
      const phone = String(profile.phone || '');
      const matchNick = nick.indexOf(kw) > -1;
      const matchPhone = phone && (phone.toLowerCase() === kw || phone.indexOf(kw) === 0);
      if (matchNick || matchPhone) {
        const userInfo = (getApp && getApp() && getApp().globalData && getApp().globalData.userInfo) || {};
        const avatar = profile.avatar || userInfo.avatar || '';
        const nickname = profile.nickname || userInfo.nickname || '我';
        result.unshift(Object.assign({}, profile, {
          id: meOpenid,
          openid: meOpenid,
          isMe: true,
          avatar: avatar,
          avatarText: nickname.slice(0, 1).toUpperCase(),
          shortId: phone ? phone.slice(-6) : '000000',
          nickname: nickname,
          fansCount: fans[meOpenid] !== undefined ? fans[meOpenid] : 0,
          followed: false
        }));
      }
    }
  } catch (e) { /* ignore */ }

  return result.sort(function (a, b) { return (b.fansCount || 0) - (a.fansCount || 0); });
}

/** 注册用户详情
 *  openid='me' → 当前登录用户完整资料(defaultProfile + 已保存)
 *  否则在 demoUsers 中查找,命中返回用户基本信息,未命中返回默认骨架 */
function userDetail(openid) {
  const id = String(openid || '');
  if (id === 'me') {
    const p = Object.assign({}, defaultProfile, read(PROFILE_KEY, {}));
    return Object.assign({}, p, {
      id: 'me',
      openid: 'me',
      isMe: true,
      avatarText: (p.nickname || '我').slice(0, 1).toUpperCase()
    });
  }
  const u = demoUsers.filter(function (x) { return x.openid === id; })[0];
  if (u) {
    return Object.assign({}, u, {
      id: u.openid,
      openid: u.openid,
      isMe: false,
      avatarText: (u.nickname || 'U').slice(0, 1).toUpperCase(),
      shortId: u.openid.slice(-6),
      fansCount: u.fansCount || 0
    });
  }
  return { openid: id, nickname: '未知用户', isMe: false, fansCount: 0 };
}

/* -------------------------- 账户与资料(资料修改) -------------------------- */
const INTEREST_TAGS = ['护航', '陪玩', '聊天', 'PC', '手游', '双端'];

const defaultProfile = {
  avatar: '',
  gender: 'm',                       // m 小哥哥 / f 小姐姐
  nickname: 'Lucas66',
  birthday: '2006-09-18',
  height: '150',
  weight: '75',
  job: '',
  city: '',
  signature: '这个用户很懒,什么也没留下...',
  interestTags: INTEREST_TAGS,
  selectedTags: ['护航'],
  cover: '',
  phone: '19308400219',
  verifyStatus: '未认证'
};

function profile() {
  const user = read(PROFILE_KEY, {});
  return Object.assign({}, defaultProfile, user);
}

function saveProfile(data) {
  const next = Object.assign({}, profile(), data || {});
  write(PROFILE_KEY, next);
  return next;
}

/* -------------------------- 设置 -------------------------- */
const defaultSettings = {
  recommend: true,   // 个性化内容推荐
  pushNotify: true,  // 推送通知(点评点赞聊天)
  showFollow: true,  // 是否允许查看我的关注
  showFans: true     // 是否允许查看我的粉丝
};

function settings() {
  return Object.assign({}, defaultSettings, read(SETTINGS_KEY, {}));
}

function saveSettings(patch) {
  const next = Object.assign({}, settings(), patch || {});
  write(SETTINGS_KEY, next);
  return next;
}

/* -------------------------- 我的优惠券 -------------------------- */
function couponList() {
  const list = read(COUPON_KEY, []);
  return list || [];
}

/* -------------------------- 我的收入 -------------------------- */
const seedIncomeLogs = [
  { id: 'i1', title: '英雄联盟 上分局结算', type: '订单收入', amount: 220, time: '09-18 21:12' },
  { id: 'i2', title: '王者荣耀 陪玩单', type: '订单收入', amount: 176, time: '09-17 20:03' },
  { id: 'i3', title: '提现到微信零钱', type: '提现支出', amount: -300, time: '09-16 12:40' },
  { id: 'i4', title: '三角洲行动 限时派单', type: '订单收入', amount: 390, time: '09-15 19:26' },
  { id: 'i5', title: '和平精英 语音陪玩', type: '订单收入', amount: 140, time: '09-14 18:05' }
];

function income() {
  const list = seedIncomeLogs.slice();
  let total = 0;
  let withdrawn = 0;
  list.forEach(function (x) {
    if (x.amount > 0) total += x.amount;
    else withdrawn += -x.amount;
  });
  return {
    balance: Math.max(0, total - withdrawn),
    totalIncome: total,
    withdrawn: withdrawn,
    pending: 0,
    todayIncome: 220,
    monthIncome: 786,
    list: list
  };
}

module.exports = {
  demoPlayers: demoPlayers,
  demoFeeds: demoFeeds,
  // 种子数据(供本地后台 admin-server 复用)
  demoUsers: demoUsers,
  seedReviews: seedReviews,
  seedPlayerFeeds: seedPlayerFeeds,
  seedComments: seedComments,
  seedIncomeLogs: seedIncomeLogs,
  defaultProfile: defaultProfile,
  defaultSettings: defaultSettings,
  // 动态
  feedList: feedList,
  feedDetail: feedDetail,
  addView: addView,
  toggleLike: toggleLike,
  commentList: commentList,
  addComment: addComment,
  publishFeed: publishFeed,
  // 护航员
  playerList: playerList,
  playerDetail: playerDetail,
  toggleFollow: toggleFollow,
  playerReviews: playerReviews,
  playerFeeds: playerFeeds,
  // 关注
  followList: followList,
  followFeeds: followFeeds,
  // 注册用户热门榜
  hotUsers: hotUsers,
  followUser: followUser,
  followedUsers: followedUsers,
  searchUsers: searchUsers,
  userDetail: userDetail,
  // 账户与资料 / 设置 / 优惠券 / 收入
  profile: profile,
  saveProfile: saveProfile,
  settings: settings,
  saveSettings: saveSettings,
  couponList: couponList,
  income: income,
  interestTags: INTEREST_TAGS,
  // 工具
  formatTime: formatTime
};
