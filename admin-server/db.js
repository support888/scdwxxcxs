/**
 * ============================================================================
 * LLS俱乐部 - 本地后台 JSON 文件数据库
 * ----------------------------------------------------------------------------
 * 零依赖,数据落盘项目外 lls-admin-data/db.json(可用环境变量 LLS_DATA_DIR 覆盖)
 * 首次运行自动从小程序演示数据(utils/mock.js)灌入种子数据
 *
 * 管理员账号(即小程序内的"我的"账号)：
 *   用户名 Lucas66 / 密码 19308400219
 * ============================================================================
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mock = require('../utils/mock.js');

/**
 * 数据目录必须放在「小程序项目目录之外」！
 * 原因:开发者工具会监听项目内文件变动,任何写盘(如浏览量+1 落盘 db.json)
 * 都会触发"重新编译 + appservice 重启",小程序被弹回首页,表现就像闪退。
 * 默认使用项目根目录的兄弟目录 lls-admin-data;也可用环境变量 LLS_DATA_DIR 覆盖。
 */
const DATA_DIR = process.env.LLS_DATA_DIR
  ? path.resolve(process.env.LLS_DATA_DIR)
  : path.join(__dirname, '..', '..', 'lls-admin-data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
/** 旧版数据目录(项目内,已废弃,启动时自动迁移) */
const LEGACY_DIR = path.join(__dirname, 'data');

/** 把旧版(项目内)数据迁移到项目外,迁移成功后删除旧目录,避免开发者工具继续监听到写盘 */
function migrateLegacy() {
  try {
    if (!fs.existsSync(LEGACY_DIR) || fs.existsSync(DB_FILE)) return;
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const legacyDb = path.join(LEGACY_DIR, 'db.json');
    if (fs.existsSync(legacyDb)) fs.copyFileSync(legacyDb, DB_FILE);
    const legacyUploads = path.join(LEGACY_DIR, 'uploads');
    if (fs.existsSync(legacyUploads)) {
      fs.cpSync(legacyUploads, path.join(DATA_DIR, 'uploads'), { recursive: true });
    }
    fs.rmSync(LEGACY_DIR, { recursive: true, force: true });
    console.log('[db] 已把项目内旧数据迁移到项目外 →', DATA_DIR);
  } catch (e) {
    console.warn('[db] 旧数据迁移失败(将重新灌入种子数据):', e.message);
  }
}

function sha256(s) {
  return crypto.createHash('sha256').update(String(s)).digest('hex');
}

function pad(n) { return n < 10 ? '0' + n : '' + n; }

/** MM-DD HH:mm(与小程序展示格式一致) */
function formatTime(ts) {
  const d = ts ? new Date(ts) : new Date();
  return pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

function clone(o) { return JSON.parse(JSON.stringify(o)); }

/** 种子数据 */
function seed() {
  return {
    meta: { version: 1, createdAt: new Date().toISOString() },
    // 管理员(小程序账号)
    admin: {
      username: 'Lucas66',
      displayName: 'Lucas66(站长)',
      phone: '19308400219',
      passwordHash: sha256('19308400219')
    },
    // 平台配置
    config: {
      announcement: '俱乐部/老板接派单提供技术服务，不承担任何担保责任，交易请走平台流程保障双方权益',
      promoText: '🔥 限时优惠 · 王者荣耀陪玩低至 5元/局 · 和平精英护航上分 100% 胜率 · LOL / 无畏契约 / CSGO 顶级声优 · 24h在线秒接单 · 新用户首单立减 10元',
      bossSwich: { is_player: 1, partner_type: 1, is_dianping: 1 }
    },
    // 注册用户
    users: clone(mock.demoUsers),
    // 护航员
    players: clone(mock.demoPlayers),
    playerReviews: clone(mock.seedReviews),
    playerFeeds: clone(mock.seedPlayerFeeds),
    // 广场动态
    feeds: clone(mock.demoFeeds),
    feedComments: clone(mock.seedComments),
    // 我的资料 / 设置开关 / 优惠券 / 收入
    profile: clone(mock.defaultProfile),
    settings: clone(mock.defaultSettings),
    coupons: [
      { id: 'cp1', name: '新手专享券', amount: 10, condition: '满50可用', expire: '2026-12-31' },
      { id: 'cp2', name: '陪玩立减券', amount: 5, condition: '无门槛', expire: '2026-10-31' }
    ],
    incomeLogs: clone(mock.seedIncomeLogs)
  };
}

let db = null;

function load() {
  if (db) return db;
  migrateLegacy();
  try {
    if (fs.existsSync(DB_FILE)) {
      db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      return db;
    }
  } catch (e) {
    console.warn('[db] 数据文件损坏,重新灌入种子数据:', e.message);
  }
  db = seed();
  save();
  console.log('[db] 已创建数据库并灌入演示数据 →', DB_FILE);
  return db;
}

function save() {
  if (!db) return;
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

function reset() {
  db = seed();
  save();
  return db;
}

/** 生成自增 ID */
function nextId(list, prefix) {
  let max = 0;
  (list || []).forEach(function (it) {
    const n = parseInt(String(it.id || '').replace(/^[a-z]+_/i, ''), 10);
    if (!isNaN(n) && n > max) max = n;
  });
  return (prefix || '') + (max + 1);
}

module.exports = {
  load: load,
  save: save,
  reset: reset,
  seed: seed,
  sha256: sha256,
  clone: clone,
  nextId: nextId,
  formatTime: formatTime,
  DATA_DIR: DATA_DIR,
  DB_FILE: DB_FILE
};
