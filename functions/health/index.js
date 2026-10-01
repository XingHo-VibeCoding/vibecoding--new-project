// Day 15 板块②：最小云函数 /api/health
// 作用：证明「AI 写的代码 → CloudBase → 公网」整条链路是通的。
// 约束：不连数据库、不写任何业务逻辑，只返回健康状态。
// Day 16-20 的所有业务接口都走今天这条同样的路。
exports.main = async (event, context) => {
  return {
    ok: true,
    service: 'trend-wave',
    time: new Date().toISOString()
  }
}
