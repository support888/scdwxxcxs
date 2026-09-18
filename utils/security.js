/**
 * ============================================================================
 * LLS俱乐部 - 内容安全检测工具 (王者荣耀式 · 分级敏感词 + 防刷屏)
 * ----------------------------------------------------------------------------
 * 【AI 后端锚点】写后端时优先看本注释,定位需要对接的位置
 * ============================================================================
 * 设计目标:模仿《王者荣耀》聊天机制,做到「输入实时预警 + 发送前分级拦截」。
 *
 * ── 三级处理策略(游戏同款)──────────────────────────────────────────────
 *   • block(一级·严禁)  : 涉政/暴恐/赌博/毒诈 等 → 直接禁止发送,提示违规
 *   • mask (二级·屏蔽)  : 脏话/人身攻击        → 自动替换为 * 后允许发送
 *   • ad   (三级·广告)  : 引流/代练/联系方式   → 自动屏蔽 + 广告提示
 *
 * ── 防绕过(归一化)─────────────────────────────────────────────────────
 *   scan() 会先做 normalize:'傻 逼' / '傻*逼' / '傻-逼' / 全角 均视为同一句,
 *   把用户用空格、符号、全角字符拆词的绕过手法还原后再匹配。
 *
 * ── 防刷屏(发言冷却 CD)────────────────────────────────────────────────
 *   guard(text,{ key, cd }) 内置频率限制,冷却期内返回 ok:false,
 *   对应王者「发言过于频繁,请稍后再试」。
 *
 * ── 同步 API(本地,零延迟,用于输入/发送)───────────────────────────────
 *   scan(text)                 → { level,hits,masked,message }  实时预警
 *   guard(text,{key,cd})       → { ok,level,hits,masked,message } 发送守卫
 *   maskText(text)             → 屏蔽后文本(展示层脱敏)
 *   checkRate(key,sec) / markRate(key) → 发言频率控制
 *
 * ── 异步 API(内容安全二次复核锚点)─────────────────────────────────────
 *   checkText / checkFields / checkImages
 *   通道:当前仅本地词库检测;后续接入自建后端时，
 *        在 checkText / checkImage 内对接服务端检测接口即可
 *
 * ── 使用示例 ────────────────────────────────────────────────────────────
 *   const security = require('../../utils/security.js');
 *   const s = security.scan(input);        // 输入时实时预警
 *   const g = security.guard(input, { key:'feed', cd:10 });
 *   if (!g.ok) { wx.showToast({ title:g.message, icon:'none' }); return; }
 *   submit(g.masked);                       // 用屏蔽后的文本提交
 * ============================================================================
 */
const app = getApp();

/* ---------- 场景值(对应微信 msgSecCheck 的 scene 字段) ---------- */
const SCENE = {
  PROFILE: 1,   // 资料(昵称/简介/签名)
  COMMENT: 2,   // 评论
  FORUM: 3,     // 论坛/动态
  LOG: 4        // 社交日志
};

/**
 * 分级敏感词库(示例最小集;真实运营请维护在服务端,前端仅作秒级兜底)
 * 注意:此处为演示用词,未包含全部违规词,上线务必替换为完整词库
 */
const WORDS = {
  // 一级:直接禁止发送
  block: [
    '赌博', '博彩', '私彩', '六合彩', '洗钱', '诈骗', '传销', '毒品',
    '枪支', '弹药', '办证', '假证', '高利贷', '裸贷', '色情', '涉黄',
    '援交', '约炮', '恐怖袭击', '爆炸物'
  ],
  // 二级:自动屏蔽为 *
  mask: [
    '你妈个逼','傻逼', '煞笔', '沙比', '智障', '脑残', '废物', '去死', '滚蛋',
    '妈的', '草泥马', 'cnm', 'nmsl', '卧槽', '我操', '操你'
  ],
  // 三级:广告引流(屏蔽 + 提示)
  ad: [
    '加微信', '加qq', '加v', '微信号', '扫码加', '私聊我', '代练', '代打',
    '包上分', '低价出售', '出售账号', '买号', '卖号', '刷单', '兼职'
  ]
};

// 干扰字符(用户常用它拆词绕过):空白/星号/点/横线/常见中英标点
const NOISE = '[\\s\\*\\-_\\.~·、,，。!！?？|/\\\\\'"“”‘’()（）\\[\\]【】<>《》+@#$%^&:;：；=]';
const NOISE_RE = new RegExp(NOISE, 'g');
// 词内允许插入的干扰字符(用于把「傻 逼」整体替换)
const GAP = NOISE + '*';

/* ---------- 归一化 / 匹配 / 屏蔽 ---------- */

/** 全角转半角 */
function toHalfWidth(s) {
  return String(s || '')
    .replace(/[\uFF01-\uFF5E]/g, function (ch) {
      return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
    })
    .replace(/\u3000/g, ' ');
}

/** 归一化:统一大小写 + 去除全部干扰字符,还原被拆分的词 */
function normalize(text) {
  if (!text) return '';
  return toHalfWidth(text).toLowerCase().replace(NOISE_RE, '');
}

/** 正则转义 */
function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 逐级匹配,返回 { level, hits } */
function match(text) {
  const norm = normalize(text);
  const hits = [];
  let level = 'ok';
  if (!norm) return { level: level, hits: hits };

  ['block', 'mask', 'ad'].forEach(function (lv) {
    WORDS[lv].forEach(function (w) {
      const nw = normalize(w);
      if (nw && norm.indexOf(nw) > -1) {
        hits.push({ word: w, level: lv });
        if (lv === 'block') level = 'block';
        else if (lv === 'mask' && level !== 'block') level = 'mask';
        else if (lv === 'ad' && level === 'ok') level = 'ad';
      }
    });
  });
  return { level: level, hits: hits };
}

/** 把命中的敏感词替换为 *(允许词内夹杂干扰字符) */
function maskText(text, mask) {
  if (!text) return '';
  const ch = mask || '*';
  let out = String(text);
  const all = WORDS.block.concat(WORDS.mask, WORDS.ad);
  all.forEach(function (w) {
    if (!w) return;
    const pattern = String(w).split('').map(escapeRe).join(GAP);
    const re = new RegExp(pattern, 'gi');
    out = out.replace(re, function (m) {
      return new Array(m.length + 1).join(ch);
    });
  });
  return out;
}

/* ---------- 对外:同步检测 ---------- */

/**
 * 实时扫描(输入时调用)
 * @returns {{level:'ok'|'mask'|'ad'|'block', hits:string[], masked:string, message:string}}
 */
function scan(text) {
  const r = match(text);
  let message = '';
  if (r.level === 'block') message = '内容含违规信息,无法发送';
  else if (r.level === 'mask') message = '含敏感词,发送后将自动屏蔽';
  else if (r.level === 'ad') message = '请勿发送广告或联系方式';

  return {
    level: r.level,
    hits: r.hits.map(function (h) { return h.word; }),
    masked: r.level === 'ok' ? String(text || '') : maskText(text),
    message: message
  };
}

/** 是否命中任意敏感词 */
function hasBadWord(text) {
  return match(text).level !== 'ok';
}

/** 兼容旧调用:返回首个敏感词 */
function localCheck(text) {
  const r = match(text);
  return r.hits.length ? r.hits[0].word : '';
}

/** 兼容旧调用:展示层脱敏 */
function filterText(text, mask) {
  return maskText(text, mask);
}

/* ---------- 对外:发言频率(防刷屏 CD) ---------- */

/**
 * 频率检查
 * @param {string} key 业务标识(如 'feed')
 * @param {number} seconds 冷却秒数
 * @returns {{ok:boolean, wait:number}} wait 为还需等待秒数
 */
function checkRate(key, seconds) {
  const cd = (seconds == null ? 10 : seconds);
  const k = 'lls_rate_' + key;
  let last = 0;
  try { last = wx.getStorageSync(k) || 0; } catch (e) { last = 0; }
  const now = Date.now();
  const diff = now - last;
  if (last && cd > 0 && diff < cd * 1000) {
    return { ok: false, wait: Math.ceil((cd * 1000 - diff) / 1000) };
  }
  return { ok: true, wait: 0 };
}

/** 记录一次发言时间(发送成功后调用) */
function markRate(key) {
  try { wx.setStorageSync('lls_rate_' + key, Date.now()); } catch (e) { /* ignore */ }
}

/* ---------- 对外:发送守卫(频率 + 分级) ---------- */

/**
 * 发送前统一守卫
 * @param {string} text
 * @param {object} [opts] { key:string, cd:number, blockMask:boolean }
 *   blockMask=true 时二级(mask/ad)也直接拦截(如「昵称」不允许出现 *)
 * @returns {{ok:boolean, level:string, hits:string[], masked:string, message:string}}
 *   level: 'ok'|'mask'|'ad'|'block'|'rate'
 *   发送方:ok 为 false 必须拦截;ok 为 true 时用 masked 提交(自动屏蔽)
 */
function guard(text, opts) {
  const o = opts || {};
  const raw = String(text || '');
  const key = o.key || 'default';
  const cd = (o.cd == null ? 10 : o.cd);

  // 1) 发言频率
  if (cd > 0) {
    const rate = checkRate(key, cd);
    if (!rate.ok) {
      return {
        ok: false, level: 'rate', hits: [], masked: raw,
        message: '发言过于频繁,请 ' + rate.wait + ' 秒后再试'
      };
    }
  }

  // 2) 分级敏感词
  const s = scan(raw);
  if (s.level === 'block') {
    return { ok: false, level: 'block', hits: s.hits, masked: s.masked, message: s.message };
  }
  if ((s.level === 'mask' || s.level === 'ad') && o.blockMask) {
    return { ok: false, level: s.level, hits: s.hits, masked: s.masked, message: s.message };
  }
  return { ok: true, level: s.level, hits: s.hits, masked: s.masked, message: s.message };
}

/* ---------- 对外:异步(微信 msgSecCheck,服务端二次复核) ---------- */

/** 获取后端基址,判断是否仍是占位配置 */
function getBase() {
  const base = (app && app.globalData && app.globalData.apiBaseUrl) || '';
  const isPlaceholder = !base || base.indexOf('example.com') > -1;
  return { base: base, isPlaceholder: isPlaceholder };
}

/** 获取 openid(优先后端下发,其次本地缓存) */
function getOpenid() {
  try {
    return wx.getStorageSync('lls_openid') ||
      (app && app.globalData && app.globalData.openid) || '';
  } catch (e) {
    return '';
  }
}

/**
 * 检测单条文本(本地词库分级检测)
 * @returns {Promise<{pass:boolean, reason:string, word?:string, suggest?:string}>}
 */
function checkText(content, opts) {
  const text = (content || '').trim();
  if (!text) return Promise.resolve({ pass: true, reason: 'empty' });

  // 本地分级词库:block / mask / ad 任一命中即拦截
  const s = scan(text);
  if (s.level !== 'ok') {
    return Promise.resolve({ pass: false, reason: 'local', level: s.level, word: s.hits[0] || '', suggestion: s.masked });
  }

  // 服务端二次复核锚点：接入自建后端时在此追加服务端检测
  return Promise.resolve({ pass: true, reason: 'local-only' });
}

/** 批量检测多个字段(如 昵称 + 个人简介) */
function checkFields(fields) {
  const list = fields || [];
  if (!list.length) return Promise.resolve({ pass: true });

  const tasks = list.map(function (f) {
    const value = typeof f === 'string' ? f : f.value;
    const name = typeof f === 'string' ? '内容' : (f.name || '内容');
    const scene = typeof f === 'string' ? undefined : f.scene;
    return checkText(value, { scene: scene }).then(function (r) {
      return Object.assign({ name: name, value: value }, r);
    });
  });

  return Promise.all(tasks).then(function (results) {
    const bad = results.filter(function (r) { return !r.pass; })[0];
    return bad ? { pass: false, item: bad, results: results } : { pass: true, results: results };
  });
}

/** 检测单张图片(服务端检测锚点：接入自建后端时在此追加图片检测) */
function checkImage(filePath) {
  if (!filePath) return Promise.resolve({ pass: true, reason: 'empty' });
  return Promise.resolve({ pass: true, reason: 'local-only' });
}

/** 批量检测图片(逐张串行,首张不通过即返回) */
function checkImages(paths) {
  const list = paths || [];
  if (!list.length) return Promise.resolve({ pass: true });

  return list.reduce(function (chain, path, index) {
    return chain.then(function (prev) {
      if (!prev.pass) return prev;
      return checkImage(path).then(function (r) {
        return r.pass ? { pass: true } : { pass: false, index: index };
      });
    });
  }, Promise.resolve({ pass: true }));
}

/** 统一的不通过提示文案 */
function toastByReason(item) {
  const level = item && item.level;
  if (level === 'ad') {
    wx.showToast({ title: '请勿发送广告或联系方式', icon: 'none' });
  } else if (level === 'mask') {
    wx.showToast({ title: '内容含敏感词,请修改后重试', icon: 'none' });
  } else if (item && (item.reason === 'local' || item.reason === 'server' || level === 'block')) {
    wx.showToast({ title: '内容含违规信息,无法发送', icon: 'none' });
  } else {
    wx.showToast({ title: '内容检测未通过', icon: 'none' });
  }
}

module.exports = {
  SCENE: SCENE,
  WORDS: WORDS,
  // 同步(王者式)
  scan: scan,
  guard: guard,
  maskText: maskText,
  normalize: normalize,
  hasBadWord: hasBadWord,
  checkRate: checkRate,
  markRate: markRate,
  // 兼容旧接口
  localCheck: localCheck,
  filterText: filterText,
  LOCAL_BAD_WORDS: WORDS.block.concat(WORDS.mask, WORDS.ad),
  // 异步(微信 msgSecCheck)
  checkText: checkText,
  checkFields: checkFields,
  checkImage: checkImage,
  checkImages: checkImages,
  toastByReason: toastByReason
};