// CloudBase 数据库 HTTP API（PostgREST）薄封装
//
// 为什么是它：免费体验版（共享集群）没有内网地址、也没有公网直连入口，
// 云函数没法用 pg 走 TCP 直连；CloudBase 官方给免费版的业务访问方式就是
// 数据库 SDK / HTTP 接口。这里用 HTTP 接口，好处是零第三方依赖（Node 内置 fetch）。
//
// 环境变量（控制台 → 云函数 → 配置 → 环境变量）：
//   CLOUDBASE_API_KEY  必填。控制台「环境管理 → API 密钥」创建的服务端密钥。
//                      控制台「绑定/注入 API Key」功能写入的变量名是 CLOUDBASE_APIKEY（无下划线），
//                      官方示例代码用的又是 CLOUDBASE_API_KEY（有下划线）——两个名字都认。
//   CLOUDBASE_API_BASE 可选。默认按环境 ID 拼 https://<envId>.api.tcloudbasegateway.com
const DEFAULT_ENV_ID = 'rednews-d5gd5vdss6b4d2119'

function apiKey() {
  return process.env.CLOUDBASE_API_KEY || process.env.CLOUDBASE_APIKEY
}

function apiBase() {
  if (process.env.CLOUDBASE_API_BASE) return process.env.CLOUDBASE_API_BASE
  // TCB_ENV 由 CloudBase 运行时注入；没注入时用兜底常量（环境 ID 不是秘密）
  const envId = process.env.TCB_ENV || process.env.CLOUDBASE_ENV || DEFAULT_ENV_ID
  return `https://${envId}.api.tcloudbasegateway.com`
}

function apiConfigured() {
  return Boolean(apiKey())
}

// path 例：/v1/rdb/rest/trends?select=id&limit=1
async function rest(path, options = {}) {
  const res = await fetch(`${apiBase()}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })

  const text = await res.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch (e) {
      data = text
    }
  }

  if (!res.ok) {
    const err = new Error(`HTTP API ${res.status}`)
    err.status = res.status
    err.detail = data // 打日志时把平台返回的原文带上，方便定位
    throw err
  }
  return data
}

module.exports = { rest, apiConfigured, apiBase }
