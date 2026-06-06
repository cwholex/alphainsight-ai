-- CreateTable
CREATE TABLE "experts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "title" TEXT,
    "institution" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "credibilityScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "initialWeight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "contrarianMode" BOOLEAN NOT NULL DEFAULT false,
    "communicationStyle" TEXT NOT NULL DEFAULT 'fundamental_analyst',
    "specialtySectors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "biasProfile" JSONB,
    "contentSources" JSONB,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "calibration" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "experts_name_key" ON "experts"("name");

-- CreateTable
CREATE TABLE "signals" (
    "id" TEXT NOT NULL,
    "expertId" TEXT NOT NULL,
    "etfCode" TEXT,
    "etfTickers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sentimentDirection" TEXT NOT NULL DEFAULT 'neutral',
    "rawSentiment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "normalizedSentiment" DOUBLE PRECISION,
    "isCalibrated" BOOLEAN NOT NULL DEFAULT false,
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "convictionScore" INTEGER NOT NULL DEFAULT 5,
    "timeHorizon" TEXT NOT NULL DEFAULT '1m',
    "thesisType" TEXT NOT NULL DEFAULT 'macro',
    "hedgingLevel" INTEGER NOT NULL DEFAULT 3,
    "emotionalTone" TEXT NOT NULL DEFAULT 'neutral',
    "specificity" INTEGER NOT NULL DEFAULT 5,
    "themes" JSONB,
    "extractedClaims" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "supportingEvidence" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sourcePlatform" TEXT NOT NULL DEFAULT 'news',
    "sourceUrl" TEXT,
    "sourceContentHash" TEXT,
    "sourceVerificationStatus" TEXT NOT NULL DEFAULT 'unverified',
    "rawSummary" TEXT,
    "isManualInjection" BOOLEAN NOT NULL DEFAULT false,
    "injectionType" TEXT,
    "signalTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "signals_expertId_idx" ON "signals"("expertId");

-- CreateIndex
CREATE INDEX "signals_signalTimestamp_idx" ON "signals"("signalTimestamp");

-- CreateIndex
CREATE INDEX "signals_sourceVerificationStatus_idx" ON "signals"("sourceVerificationStatus");

-- AddForeignKey
ALTER TABLE "signals" ADD CONSTRAINT "signals_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "experts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "etf_holdings" (
    "id" TEXT NOT NULL,
    "etfCode" TEXT NOT NULL,
    "etfName" TEXT NOT NULL,
    "sector" TEXT,
    "subSector" TEXT,
    "shares" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentWeight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgCostPerShare" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costBasis" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "marketValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priceSnapshotTimestamp" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "etf_holdings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "etf_holdings_etfCode_key" ON "etf_holdings"("etfCode");

-- CreateTable
CREATE TABLE "rebalancing_events" (
    "id" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "triggerSignals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rebalancingActions" JSONB,
    "totalTurnoverRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalEstimatedTca" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expectedNetReturn" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'suggested',
    "managerNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rebalancing_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etf_analytics" (
    "id" TEXT NOT NULL,
    "etfCode" TEXT NOT NULL,
    "calculationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rollingReturns90d" DOUBLE PRECISION[] DEFAULT ARRAY[]::DOUBLE PRECISION[],
    "annualizedVolatility" DOUBLE PRECISION,
    "sharpeRatio90d" DOUBLE PRECISION,
    "correlationWith" JSONB,
    "marketCapWeight" DOUBLE PRECISION,
    "averageDailyVolume" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "etf_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "etf_analytics_etfCode_key" ON "etf_analytics"("etfCode");

-- CreateTable
CREATE TABLE "theme_mappings" (
    "id" TEXT NOT NULL,
    "themeName" TEXT NOT NULL,
    "themeDescription" TEXT,
    "parentTheme" TEXT,
    "etfMappings" JSONB,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "theme_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "theme_mappings_themeName_key" ON "theme_mappings"("themeName");

-- CreateTable
CREATE TABLE "expert_calibration_logs" (
    "id" TEXT NOT NULL,
    "expertId" TEXT NOT NULL,
    "themeId" TEXT,
    "timeHorizon" TEXT NOT NULL DEFAULT '1m',
    "signalsCount" INTEGER NOT NULL DEFAULT 0,
    "correctPredictions" INTEGER NOT NULL DEFAULT 0,
    "accuracyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "calibrationFactor" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "contrarianFactor" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expert_calibration_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expert_calibration_logs_expertId_idx" ON "expert_calibration_logs"("expertId");

-- AddForeignKey
ALTER TABLE "expert_calibration_logs" ADD CONSTRAINT "expert_calibration_logs_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "experts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "technical_indicators" (
    "id" TEXT NOT NULL,
    "indicatorType" TEXT NOT NULL,
    "targetEtf" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "signal" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL DEFAULT 'daily',
    "strength" INTEGER NOT NULL DEFAULT 5,
    "description" TEXT,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "technical_indicators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "technical_indicators_indicatorType_targetEtf_idx" ON "technical_indicators"("indicatorType", "targetEtf");

-- CreateTable
CREATE TABLE "attribution_reports" (
    "id" TEXT NOT NULL,
    "rebalancingEventId" TEXT NOT NULL,
    "reportDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "triggerSignalsDetail" JSONB,
    "contributionAnalysis" JSONB,
    "transactionCostDetail" JSONB,
    "historicalPerformanceReview" JSONB,
    "pdfExportUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attribution_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manual_injections" (
    "id" TEXT NOT NULL,
    "injectionType" TEXT NOT NULL,
    "inputContent" TEXT NOT NULL,
    "extractedText" TEXT,
    "associatedExpertId" TEXT,
    "associatedExpertName" TEXT,
    "associatedEtfCode" TEXT,
    "processingStatus" TEXT NOT NULL DEFAULT 'pending',
    "generatedSignalId" TEXT,
    "processingError" TEXT,
    "injectionTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manual_injections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateTable
CREATE TABLE "system_configs" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "system_configs_key_key" ON "system_configs"("key");

-- CreateTable
CREATE TABLE "suggested_etfs" (
    "id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "name" TEXT,
    "sector" TEXT,
    "mentionedBy" TEXT NOT NULL,
    "expertId" TEXT,
    "signalId" TEXT,
    "sourceUrl" TEXT,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "similarToExisting" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suggested_etfs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "suggested_etfs_status_idx" ON "suggested_etfs"("status");

-- CreateIndex
CREATE INDEX "suggested_etfs_ticker_idx" ON "suggested_etfs"("ticker");

-- CreateTable
CREATE TABLE "_SignalToRebalancingEvent" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_SignalToRebalancingEvent_AB_unique" ON "_SignalToRebalancingEvent"("A", "B");

-- CreateIndex
CREATE INDEX "_SignalToRebalancingEvent_B_index" ON "_SignalToRebalancingEvent"("B");

-- AddForeignKey
ALTER TABLE "_SignalToRebalancingEvent" ADD CONSTRAINT "_SignalToRebalancingEvent_A_fkey" FOREIGN KEY ("A") REFERENCES "rebalancing_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SignalToRebalancingEvent" ADD CONSTRAINT "_SignalToRebalancingEvent_B_fkey" FOREIGN KEY ("B") REFERENCES "signals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AlphaInsight AI - Seed Data SQL
-- Run this in Neon SQL Editor after migration is applied

-- Admin user (password: admin123, hashed with bcrypt)
INSERT INTO "users" ("id", "email", "name", "role", "password", "createdAt", "updatedAt")
VALUES (
  'admin_seed_001',
  'admin@alphainsight.ai',
  'Admin',
  'admin',
  '$2a$10$YourHashedPasswordHereReplaceWithRealHash',
  NOW(),
  NOW()
)
ON CONFLICT ("email") DO NOTHING;

-- ETF Holdings (24 ETFs)
INSERT INTO "etf_holdings" ("id", "etfCode", "etfName", "sector", "subSector", "shares", "currentWeight", "avgCostPerShare", "costBasis", "marketValue", "lastPrice", "createdAt", "updatedAt") VALUES
('etf_spy', 'SPY', 'SPDR S&P 500 ETF', '美股大盘', '美股大盘', 100, 0, 450, 45000, 49500, 495, NOW(), NOW()),
('etf_qqq', 'QQQ', 'Invesco QQQ Trust', '科技', '美股科技', 80, 0, 380, 30400, 33440, 418, NOW(), NOW()),
('etf_ewh', 'EWH', 'iShares MSCI Hong Kong ETF', '香港', '香港/恒生', 500, 0, 25, 12500, 13750, 27.5, NOW(), NOW()),
('etf_fxi', 'FXI', 'iShares China Large-Cap ETF', '中国', '中国大盘', 300, 0, 28, 8400, 9240, 30.8, NOW(), NOW()),
('etf_gld', 'GLD', 'SPDR Gold Shares', '商品', '黄金', 60, 0, 180, 10800, 11880, 198, NOW(), NOW()),
('etf_tlt', 'TLT', 'iShares 20+ Year Treasury Bond ETF', '债券', '长期国债', 40, 0, 95, 3800, 4180, 104.5, NOW(), NOW()),
('etf_ibit', 'IBIT', 'iShares Bitcoin Trust', '加密货币', '加密货币', 200, 0, 35, 7000, 7700, 38.5, NOW(), NOW()),
('etf_smh', 'SMH', 'VanEck Semiconductor ETF', '科技', '半导体', 50, 0, 220, 11000, 12100, 242, NOW(), NOW()),
('etf_kweb', 'KWEB', 'KraneShares CSI China Internet ETF', '中国', '中国互联网', 150, 0, 28, 4200, 4620, 30.8, NOW(), NOW()),
('etf_eem', 'EEM', 'iShares MSCI Emerging Markets ETF', '新兴市场', '新兴市场', 100, 0, 42, 4200, 4620, 46.2, NOW(), NOW()),
('etf_ewj', 'EWJ', 'iShares MSCI Japan ETF', '日本', '日本大盘', 120, 0, 58, 6960, 7656, 63.8, NOW(), NOW()),
('etf_xle', 'XLE', 'Energy Select Sector SPDR Fund', '能源', '传统石油', 80, 0, 88, 7040, 7744, 96.8, NOW(), NOW()),
('etf_inda', 'INDA', 'iShares MSCI India ETF', '印度', '印度', 100, 0, 48, 4800, 5280, 52.8, NOW(), NOW()),
('etf_mchi', 'MCHI', 'iShares MSCI China ETF', '中国', 'MSCI中国', 200, 0, 45, 9000, 9900, 49.5, NOW(), NOW()),
('etf_cqqq', 'CQQQ', 'Invesco China Technology ETF', '中国', '中国科技', 100, 0, 55, 5500, 6050, 60.5, NOW(), NOW()),
('etf_slv', 'SLV', 'iShares Silver Trust', '商品', '白银', 100, 0, 22, 2200, 2420, 24.2, NOW(), NOW()),
('etf_copx', 'COPX', 'Global X Copper Miners ETF', '商品', '铜矿', 80, 0, 35, 2800, 3080, 38.5, NOW(), NOW()),
('etf_ura', 'URA', 'Global X Uranium ETF', '商品', '铀', 50, 0, 28, 1400, 1540, 30.8, NOW(), NOW()),
('etf_vnm', 'VNM', 'VanEck Vietnam ETF', '越南', '越南', 80, 0, 15, 1200, 1320, 16.5, NOW(), NOW()),
('etf_ksa', 'KSA', 'iShares MSCI Saudi Arabia ETF', '沙特', '沙特', 60, 0, 32, 1920, 2112, 35.2, NOW(), NOW()),
('etf_asea', 'ASEA', 'Global X FTSE Southeast Asia ETF', '东南亚', '东南亚', 70, 0, 18, 1260, 1386, 19.8, NOW(), NOW()),
('etf_vgk', 'VGK', 'Vanguard FTSE Europe ETF', '欧洲', '欧洲大盘', 90, 0, 62, 5580, 6138, 68.2, NOW(), NOW()),
('etf_ewy', 'EWY', 'iShares MSCI South Korea ETF', '韩国', '韩国', 80, 0, 65, 5200, 5720, 71.5, NOW(), NOW()),
('etf_unq', 'UNG', 'United States Natural Gas Fund', '能源', '天然气', 100, 0, 12, 1200, 1320, 13.2, NOW(), NOW()),
('etf_vnq', 'VNQ', 'Vanguard Real Estate ETF', 'REITs', '美国REITs', 60, 0, 85, 5100, 5610, 93.5, NOW(), NOW()),
('etf_uup', 'UUP', 'Invesco DB US Dollar Index Bullish Fund', '外汇', '美元指数', 50, 0, 28, 1400, 1540, 30.8, NOW(), NOW())
ON CONFLICT ("etfCode") DO NOTHING;

-- Recalculate weights
DO $$
DECLARE
  total_val NUMERIC;
BEGIN
  SELECT COALESCE(SUM("marketValue"), 0) INTO total_val FROM "etf_holdings";
  IF total_val > 0 THEN
    UPDATE "etf_holdings" SET "currentWeight" = "marketValue" / total_val;
  END IF;
END $$;

-- Experts (7 experts)
INSERT INTO "experts" ("id", "name", "nameEn", "title", "institution", "isActive", "credibilityScore", "initialWeight", "contrarianMode", "communicationStyle", "specialtySectors", "biasProfile", "contentSources", "aliases", "createdAt", "updatedAt") VALUES
('exp_honghao', '洪灝', 'Hong Hao', '首席经济学家', '思睿集团 GROW Investment', true, 0.90, 1, false, 'principled_macro', ARRAY['中国大盘', '宏观', '港股', '美股'], '{"baseSentiment": 0, "permabullSectors": [], "permabearSectors": []}'::jsonb, '[{"type": "youtube_channel", "identifier": "PLACEHOLDER_HONGHAO_YT", "fetchFrequency": "0 8 * * *", "lastFetchedAt": null, "note": "洪灝 YouTube 频道，需补充真实ID"}, {"type": "news_api", "identifier": "\"Hong Hao\" OR \"洪灝\" (macro OR market OR 宏观 OR 市场)", "fetchFrequency": "0 8 * * *", "lastFetchedAt": null, "note": "NewsAPI 搜索"}, {"type": "brave_search", "identifier": "\"Hong Hao\" 洪灝 观点 市场", "fetchFrequency": "0 8 * * *", "lastFetchedAt": null, "note": "Brave Search 搜索"}]'::jsonb, ARRAY['Hong Hao', '洪浩', '洪灝'], NOW(), NOW()),

('exp_timmer', 'Jurrien Timmer', 'Jurrien Timmer', '全球宏观总监', 'Fidelity Investments', true, 0.88, 1, false, 'principled_macro', ARRAY['美股', '宏观', '美联储', '比特币'], '{"baseSentiment": 0.05, "permabullSectors": ["美股"], "permabearSectors": []}'::jsonb, '[{"type": "youtube_channel", "identifier": "PLACEHOLDER_FIDELITY_YT", "fetchFrequency": "0 8 * * *", "lastFetchedAt": null, "note": "Fidelity YouTube 频道，需补充真实ID"}, {"type": "news_api", "identifier": "\"Jurrien Timmer\" (Fed OR bitcoin OR macro OR market)", "fetchFrequency": "0 8 * * *", "lastFetchedAt": null, "note": "NewsAPI 搜索"}, {"type": "brave_search", "identifier": "\"Jurrien Timmer\" Fidelity view market", "fetchFrequency": "0 8 * * *", "lastFetchedAt": null, "note": "Brave Search 搜索"}]'::jsonb, ARRAY['Jurrien Timmer', 'Timmer'], NOW(), NOW()),

('exp_choi', '蔡金強', 'Choi Kin Keung', '财经评论员', '独立分析师', true, 0.82, 1, false, 'fundamental_analyst', ARRAY['港股', 'A股', '中国大盘'], '{"baseSentiment": 0.1, "permabullSectors": ["港股"], "permabearSectors": []}'::jsonb, '[{"type": "youtube_channel", "identifier": "PLACEHOLDER_CHOI_YT", "fetchFrequency": "0 8 * * *", "lastFetchedAt": null, "note": "蔡金強 YouTube 频道，需补充真实ID"}, {"type": "news_api", "identifier": "\"蔡金強\" OR \"Choi Kin Keung\" (港股 OR 恒指 OR 市场)", "fetchFrequency": "0 8 * * *", "lastFetchedAt": null, "note": "NewsAPI 搜索"}, {"type": "brave_search", "identifier": "\"蔡金強\" 港股 观点 分析", "fetchFrequency": "0 8 * * *", "lastFetchedAt": null, "note": "Brave Search 搜索"}]'::jsonb, ARRAY['蔡金强', 'Choi Kin Keung', '蔡金強'], NOW(), NOW()),

('exp_tam', '谭新強', 'Tam San Keung', '股评人', '独立股评人', true, 0.75, 1, false, 'narrative_driven', ARRAY['港股', '中国大盘'], '{"baseSentiment": 0, "permabullSectors": [], "permabearSectors": []}'::jsonb, '[{"type": "youtube_channel", "identifier": "PLACEHOLDER_TAM_YT", "fetchFrequency": "0 8 * * *", "lastFetchedAt": null, "note": "谭新強 YouTube 频道，需补充真实ID"}, {"type": "news_api", "identifier": "\"谭新強\" OR \"谭新强\" (港股 OR 股市 OR 分析)", "fetchFrequency": "0 8 * * *", "lastFetchedAt": null, "note": "NewsAPI 搜索"}, {"type": "brave_search", "identifier": "\"谭新強\" 港股 观点", "fetchFrequency": "0 8 * * *", "lastFetchedAt": null, "note": "Brave Search 搜索"}]'::jsonb, ARRAY['谭新强', 'Tam San Keung'], NOW(), NOW()),

('exp_au', '區偉志', 'Au Wai Chi', '股评人', '独立股评人', true, 0.72, 1, false, 'technical_chartist', ARRAY['港股', '美股'], '{"baseSentiment": -0.05, "permabullSectors": [], "permabearSectors": ["A股"]}'::jsonb, '[{"type": "youtube_channel", "identifier": "PLACEHOLDER_AU_YT", "fetchFrequency": "0 8 * * *", "lastFetchedAt": null, "note": "區偉志 YouTube 频道，需补充真实ID"}, {"type": "news_api", "identifier": "\"區偉志\" OR \"区伟志\" (港股 OR 技术分析 OR 股市)", "fetchFrequency": "0 8 * * *", "lastFetchedAt": null, "note": "NewsAPI 搜索"}, {"type": "brave_search", "identifier": "\"區偉志\" 港股 技术分析", "fetchFrequency": "0 8 * * *", "lastFetchedAt": null, "note": "Brave Search 搜索"}]'::jsonb, ARRAY['区伟志', 'Au Wai Chi', '區偉志'], NOW(), NOW()),

('exp_lambl', '林本利', 'Lam Ben Lee', '财经评论员', '独立财经评论员', true, 0.78, 1, false, 'fundamental_analyst', ARRAY['港股', 'A股', '宏观'], '{"baseSentiment": 0.05, "permabullSectors": ["港股"], "permabearSectors": []}'::jsonb, '[{"type": "youtube_channel", "identifier": "PLACEHOLDER_LAMBL_YT", "fetchFrequency": "0 8 * * *", "lastFetchedAt": null, "note": "林本利 YouTube 频道，需补充真实ID"}, {"type": "news_api", "identifier": "\"林本利\" (港股 OR 财经 OR 分析 OR 楼市)", "fetchFrequency": "0 8 * * *", "lastFetchedAt": null, "note": "NewsAPI 搜索"}, {"type": "brave_search", "identifier": "\"林本利\" 港股 财经 观点", "fetchFrequency": "0 8 * * *", "lastFetchedAt": null, "note": "Brave Search 搜索"}]'::jsonb, ARRAY['林本利', 'Lam Ben Lee'], NOW(), NOW()),

('exp_lamym', '林一鳴', 'Lam Yat Ming', '股评人', '独立股评人', true, 0.70, 1, false, 'emotional_momentum', ARRAY['港股', '美股'], '{"baseSentiment": 0.1, "permabullSectors": ["港股"], "permabearSectors": []}'::jsonb, '[{"type": "youtube_channel", "identifier": "PLACEHOLDER_LAMYM_YT", "fetchFrequency": "0 8 * * *", "lastFetchedAt": null, "note": "林一鳴 YouTube 频道，需补充真实ID"}, {"type": "news_api", "identifier": "\"林一鳴\" OR \"林一鸣\" (港股 OR 股市 OR 分析)", "fetchFrequency": "0 8 * * *", "lastFetchedAt": null, "note": "NewsAPI 搜索"}, {"type": "brave_search", "identifier": "\"林一鳴\" 港股 股评", "fetchFrequency": "0 8 * * *", "lastFetchedAt": null, "note": "Brave Search 搜索"}]'::jsonb, ARRAY['林一鸣', 'Lam Yat Ming', '林一鳴'], NOW(), NOW())
ON CONFLICT ("name") DO NOTHING;

-- Theme Mappings
INSERT INTO "theme_mappings" ("id", "themeName", "themeDescription", "parentTheme", "etfMappings", "keywords", "lastUpdated", "createdAt") VALUES
('theme_ai', 'AI Infrastructure', '人工智能基础设施建设', NULL, '[{"ticker": "SMH", "mappingType": "primary", "semanticScore": 0.95, "overlapBasis": "半导体ETF，包含NVIDIA等AI芯片股"}, {"ticker": "QQQ", "mappingType": "secondary", "semanticScore": 0.75, "overlapBasis": "纳斯达克100包含大量AI相关科技股"}]'::jsonb, ARRAY['AI', 'artificial intelligence', 'chatgpt', 'nvidia', 'semiconductor', '芯片', '人工智能'], NOW(), NOW()),

('theme_china', 'China Reopening', '中国重新开放/经济复苏', NULL, '[{"ticker": "FXI", "mappingType": "primary", "semanticScore": 0.9, "overlapBasis": "中国大盘ETF"}, {"ticker": "KWEB", "mappingType": "primary", "semanticScore": 0.85, "overlapBasis": "中国互联网ETF"}, {"ticker": "EWH", "mappingType": "secondary", "semanticScore": 0.6, "overlapBasis": "香港市场受中国政策影响"}]'::jsonb, ARRAY['china', 'reopening', '中国', '复苏', 'reopen', 'covid', '疫情', '消费'], NOW(), NOW()),

('theme_fed', 'Fed Pivot', '美联储转向降息', NULL, '[{"ticker": "TLT", "mappingType": "primary", "semanticScore": 0.95, "overlapBasis": "长期国债ETF，降息时价格上涨"}, {"ticker": "QQQ", "mappingType": "secondary", "semanticScore": 0.7, "overlapBasis": "成长股受益于低利率环境"}]'::jsonb, ARRAY['fed', 'federal reserve', 'interest rate', 'rate cut', '降息', '美联储', '利率'], NOW(), NOW()),

('theme_gold', 'Gold Safe Haven', '黄金避险', NULL, '[{"ticker": "GLD", "mappingType": "primary", "semanticScore": 0.98, "overlapBasis": "黄金ETF"}]'::jsonb, ARRAY['gold', 'safe haven', 'inflation', 'hedge', '黄金', '避险', '通胀', '对冲'], NOW(), NOW()),

('theme_crypto', 'Crypto Adoption', '加密货币采用', NULL, '[{"ticker": "IBIT", "mappingType": "primary", "semanticScore": 0.98, "overlapBasis": "比特币现货ETF"}]'::jsonb, ARRAY['bitcoin', 'crypto', 'cryptocurrency', 'btc', 'eth', '比特币', '加密货币', '区块链'], NOW(), NOW()),

('theme_japan', 'Japan Recovery', '日本经济复苏', NULL, '[{"ticker": "EWJ", "mappingType": "primary", "semanticScore": 0.95, "overlapBasis": "日本大盘ETF"}]'::jsonb, ARRAY['japan', 'nikkei', 'yen', '日本', '日经', '日元', '东证'], NOW(), NOW()),

('theme_em', 'Emerging Markets Growth', '新兴市场增长', NULL, '[{"ticker": "EEM", "mappingType": "primary", "semanticScore": 0.9, "overlapBasis": "新兴市场ETF"}, {"ticker": "INDA", "mappingType": "primary", "semanticScore": 0.85, "overlapBasis": "印度ETF"}]'::jsonb, ARRAY['emerging markets', 'india', 'brazil', '新兴市场', '印度', '巴西', '东南亚'], NOW(), NOW()),

('theme_energy', 'Energy Transition', '能源转型', NULL, '[{"ticker": "XLE", "mappingType": "primary", "semanticScore": 0.95, "overlapBasis": "能源板块ETF"}]'::jsonb, ARRAY['oil', 'energy', 'crude', '石油', '能源', '原油', '天然气'], NOW(), NOW())
ON CONFLICT ("themeName") DO NOTHING;

-- System Config: Open Collection Sources
INSERT INTO "system_configs" ("id", "key", "value", "description", "updatedAt", "createdAt")
VALUES (
  'config_open_collection',
  'open_collection_sources',
  '[{"type": "rss_feed", "identifier": "https://feeds.bloomberg.com/markets/news.rss", "name": "Bloomberg Markets", "region": "global"}, {"type": "rss_feed", "identifier": "https://feeds.bloomberg.com/news/economy.rss", "name": "Bloomberg Economy", "region": "global"}, {"type": "rss_feed", "identifier": "https://www.scmp.com/rss/318198/feed", "name": "SCMP Business", "region": "hk"}, {"type": "rss_feed", "identifier": "https://www.scmp.com/rss/318200/feed", "name": "SCMP Markets", "region": "hk"}, {"type": "rss_feed", "identifier": "https://www.hkej.com/rss/feed.xml", "name": "信报财经", "region": "hk"}, {"type": "rss_feed", "identifier": "https://news.mingpao.com/rss/pns/section/0003/feed.xml", "name": "明报财经", "region": "hk"}, {"type": "rss_feed", "identifier": "https://www.etnet.com.hk/www/tc/news/rss.php", "name": "经济日报", "region": "hk"}, {"type": "podcast_rss", "identifier": "https://feeds.megaphone.fm/BLM1726920077", "name": "Moving Markets (Bloomberg)", "region": "global", "note": "Bloomberg Moving Markets podcast - 可能包含多位专家观点"}, {"type": "podcast_rss", "identifier": "https://feeds.megaphone.fm/BLM2074447575", "name": "Odd Lots (Bloomberg)", "region": "global", "note": "Bloomberg Odd Lots podcast"}, {"type": "rss_feed", "identifier": "https://feeds.afr.com/feed", "name": "Australian Financial Review", "region": "global"}, {"type": "rss_feed", "identifier": "https://www.ft.com/?format=rss", "name": "Financial Times", "region": "global"}]'::jsonb,
  '开放式收集源配置 - 通用财经媒体RSS和Podcast',
  NOW(),
  NOW()
)
ON CONFLICT ("key") DO NOTHING;
