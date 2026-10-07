// CloudBase 数据库 HTTP API（PostgREST）薄封装
// （与 functions/hot/rest.js 同一份；云函数各自独立部署，各自带一份，MVP 阶段接受这份受控重复）
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
  const envId = process.env.TCB_ENV || process.env.CLOUDBASE_ENV || DEFAULT_ENV_ID
  return `https://${envId}.api.tcloudbasegateway.com`
}

function apiConfigured() {
  return Boolean(apiKey())
}

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
    err.detail = data
    throw err
  }
  return data
}

module.exports = { rest, apiConfigured, apiBase }
