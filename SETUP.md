# AlphaInsight AI 设置指南

## 1. GitHub Actions CRON_SECRET 设置

自动抓取需要 `CRON_SECRET` 环境变量。设置步骤：

### 在 Render Dashboard 中设置
1. 访问 https://dashboard.render.com
2. 选择 `alphainsight-ai` Web Service
3. 点击 **Environment** 标签
4. 添加变量：`CRON_SECRET` = 任意随机字符串（如 `your-random-secret-12345`）
5. 点击 **Save Changes**
6. 服务会自动重新部署

### 在 GitHub 仓库中设置
1. 访问 https://github.com/cwholex/alphainsight-ai/settings/secrets/actions
2. 点击 **New repository secret**
3. Name: `CRON_SECRET`
4. Value: 与 Render 中设置的相同值
5. 点击 **Add secret**

## 2. 自动抓取时间表

| 任务 | 频率 | 端点 |
|------|------|------|
| 抓取专家信号 | 每天 08:00 UTC | `/api/cron/fetch-signals` |
| 更新 ETF 价格 | 每 4 小时 | `/api/cron/update-prices` |
| 计算调仓建议 | 每周一 09:00 UTC | `/api/cron/calculate-rebalancing` |

## 3. 手动触发抓取

访问 GitHub Actions 页面手动运行：
https://github.com/cwholex/alphainsight-ai/actions/workflows/cron.yml

点击 **Run workflow** 按钮。

## 4. 更新专家 YouTube 频道

### 发现频道
```bash
# 批量发现所有专家的频道
curl https://alphainsight-ai.onrender.com/api/discover-expert-sources

# 发现特定专家
curl -X POST https://alphainsight-ai.onrender.com/api/discover-expert-sources \
  -H "Content-Type: application/json" \
  -d '{"expertId":"exp_choi"}'
```

### 更新频道 ID
```bash
curl -X POST https://alphainsight-ai.onrender.com/api/update-expert-youtube \
  -H "Content-Type: application/json" \
  -d '{"expertId":"exp_lamym","youtubeChannelId":"eddielam2000"}'
```

## 5. 已发现的频道

| 专家 | YouTube 频道 | 状态 |
|------|-------------|------|
| 林一鳴 | @eddielam2000 | ✅ 已更新 |
| 其他 | 待发现 | 🔍 需要搜索 |

## 6. 系统架构

```
GitHub Actions (Cron) → Render API → Prisma/Neon DB
                              ↓
                         YouTube API
                         NewsAPI
                         Brave Search
                         RSS Feeds
                         Kimi AI (信号提取)
```

## 7. 监控

- 健康检查: https://alphainsight-ai.onrender.com/api/health
- Dashboard: https://alphainsight-ai.onrender.com/dashboard

## 8. 故障排除

### 抓取没有数据
- 检查 `CRON_SECRET` 是否正确设置
- 检查 API Keys (YouTube, NewsAPI, Brave) 是否有效
- 查看 Render Logs: https://dashboard.render.com

### 专家没有信号
- 运行频道发现: `/api/discover-expert-sources`
- 检查专家内容源配置: `/api/experts`
- 手动触发抓取测试

### 数据库问题
- 运行修复: `/api/health?fix=true`
- 检查 Neon DB 连接状态
