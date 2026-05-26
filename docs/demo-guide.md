# KickStock 演示网站操作指南 / Demo Website Operation Guide

> **演示网站 / Demo Site**: [https://ln6j8wpg.mule.page/](https://ln6j8wpg.mule.page/)
>
> 支持中英文界面切换 / Supports Chinese & English interface switching

---

## 目录 / Table of Contents

1. [概览 / Overview](#1-概览--overview)
2. [连接钱包 / Connect Wallet](#2-连接钱包--connect-wallet)
3. [球员市场 / Player Market](#3-球员市场--player-market)
4. [交易面板 / Trading Panel](#4-交易面板--trading-panel)
5. [AMM 流动池 / AMM Pool](#5-amm-流动池--amm-pool)
6. [投资组合 / Portfolio](#6-投资组合--portfolio)
7. [指数 ETF / Index ETF](#7-指数-etf--index-etf)
8. [绩效预言机 / Performance Oracle](#8-绩效预言机--performance-oracle)
9. [排行榜 / Leaderboard](#9-排行榜--leaderboard)
10. [测试网水龙头 / Testnet Faucet](#10-测试网水龙头--testnet-faucet)
11. [系统架构 / Architecture](#11-系统架构--architecture)
12. [演示钱包 / Demo Wallets](#12-演示钱包--demo-wallets)
13. [语言切换 / Language Toggle](#13-语言切换--language-toggle)

---

## 1. 概览 / Overview

KickStock 是一个 **FanFi（粉丝金融）** 平台，将 2026 FIFA 世界杯球员代币化为链上可交易的 ERC-20 代币，部署在 **X Layer 测试网（chainId 195）**。

KickStock is a **FanFi (Fan Finance)** platform that tokenizes FIFA World Cup 2026 football players into tradeable on-chain ERC-20 tokens on **X Layer Testnet (chainId 195)**.

### 核心数据 / Core Stats

| 指标 / Metric | 数值 / Value |
|---|---|
| 球员数 / Players | 200 |
| 国家数 / Nations | 48 |
| 毕业门槛 / Graduation Threshold | $50,000 mUSDT |
| 指数数 / Indices | 58 |

### 主页入口 / Homepage Entry

打开网站后，您将看到：

When you open the website, you will see:

- **动画粒子背景** — Animated particle background with connected dots
- **全局统计栏** — Global stats bar with animated counters
- **两个主要按钮**：
  - `探索市场 / Explore Market` — 跳转到球员市场
  - `连接钱包 / Connect Wallet` — 打开钱包连接弹窗

---

## 2. 连接钱包 / Connect Wallet

### 操作步骤 / Steps

1. 点击右上角 **连接钱包 / Connect Wallet** 按钮
2. 在弹窗中选择钱包类型：
   - 🔶 **OKX Wallet** — 推荐，项目原生支持
   - 🦊 **MetaMask**
   - 🌈 **RainbowKit**
3. 连接后，导航栏显示钱包地址缩写（如 `0xd247...f4d1`）
4. 再次点击可断开连接

### 说明 / Notes

- 演示网站使用模拟连接，无需真实钱包
- 实际项目需要连接到 X Layer 测试网（Chain ID: 195）

---

## 3. 球员市场 / Player Market

球员市场展示 200 位来自 48 个国家的明星球员卡片。

The Player Market displays 200 star players from 48 nations as interactive cards.

### 搜索与筛选 / Search & Filter

| 控件 / Control | 说明 / Description |
|---|---|
| **搜索框** | 输入球员姓名或国家进行搜索 |
| **位置筛选** | 前锋(FW)、中场(MF)、后卫(DF)、守门员(GK) |
| **国家筛选** | 从下拉列表选择国家 |
| **排序** | 按价格↓↑、涨跌↓↑、市值↓ 排列 |

### 球员卡片信息 / Player Card Info

每张卡片包含：

- 🏳️ 国旗 + 球员姓名
- 位置徽章（颜色区分：FW红色、MF青色、DF绿色、GK金色）
- 当前价格（mUSDT）
- 24小时涨跌幅（绿色上涨 / 红色下跌）
- 迷你K线图（sparkline）
- 市值（MCap）

### 交互 / Interaction

**点击任意球员卡片** → 自动跳转到交易面板并选中该球员。

---

## 4. 交易面板 / Trading Panel

在联合曲线（Bonding Curve）上买卖球员代币。

Buy & sell player tokens on the bonding curve.

### 联合曲线公式 / Bonding Curve Formula

```
price(supply) = 100 + 10 × supply (mUSDT)
```

### 操作步骤 / Steps

1. **选择球员** — 从下拉列表选择球员
2. **选择模式** — 点击 `买入 / Buy` 或 `卖出 / Sell` 标签
3. **设置数量** — 输入数量（1-100），或拖动滑块
4. **设置滑点** — 选择滑点容差：0.5%、1%（默认）、5%
5. **查看费用** — 费用明细实时更新：
   - 小计 / Subtotal
   - 手续费 3%（推荐奖励30% + 分红池50% + 协议20%）
   - 总计 / Total
6. **执行交易** — 点击 `授权并买入 / Approve & Buy` 或 `卖出代币 / Sell Tokens`
7. **查看回执** — 弹窗显示交易哈希和 OKLink 浏览器链接

### 联合曲线可视化 / Bonding Curve Visualization

右侧面板实时显示：

- **SVG 曲线图** — 标注当前价格点和买入后价格点
- **当前价格** — 基于当前供应量
- **流通供应量** — 已发行代币数
- **储备金** — 联合曲线锁定的 mUSDT
- **毕业进度** — 达到 $50,000 储备金即毕业

---

## 5. AMM 流动池 / AMM Pool

球员"毕业"后（储备金达到 $50,000），交易转移到恒定乘积 AMM。

After a player "graduates" (reserve hits $50,000), trading moves to a constant-product AMM.

### 池统计 / Pool Stats

- **总流动性 / Total Liquidity** — 池中锁定总值
- **24小时交易量 / 24h Volume**
- **预估年化收益率 / Est. APR**

### 兑换操作 / Swap

1. 在上方输入框输入 mUSDT 数量
2. 下方自动计算可兑换的球员代币数量
3. 查看汇率和价格影响
4. 点击 `兑换 / Swap` 执行

**手续费 1%** 分配：

| 比例 | 用途 |
|---|---|
| 60% | LP 奖励 |
| 30% | 分红池 |
| 10% | 协议 |

### 流动性操作 / Liquidity

- **添加 / Add** — 输入 mUSDT 和球员代币数量，查看池份额后添加
- **移除 / Remove** — 输入要移除的 LP 代币数量，查看可收回资产后移除

### x × y = k 曲线 / Curve

底部显示恒定乘积 AMM 曲线的 SVG 可视化，标注当前状态点。

---

## 6. 投资组合 / Portfolio

追踪持仓、分红和整体表现。

Track your holdings, dividends, and overall performance.

### 总览指标 / Summary Metrics

| 指标 | 说明 |
|---|---|
| 总价值 / Total Value | 所有持仓当前市值 |
| 总盈亏 / Total P&L | 累计盈亏金额 |
| 收益率 / Return | 投资回报百分比 |
| 分红 / Dividends | 累计获得分红 |

### 持仓表 / Holdings Table

显示每个持有代币的：球员名、数量、均价、当前价、盈亏额、涨跌幅。

### 交易历史 / Transaction History

显示所有交易记录：类型（买入/卖出/领取）、球员、数量、价格、日期、状态。

### 分红面板 / Dividend Panel

- 查看累计分红和可领取金额
- 点击 `领取分红 / Claim Dividends` 收取

### 资产配置 / Allocation

- **饼图** — CSS 圆锥渐变实现的持仓比例图
- **图例** — 每个持仓的百分比

### 30天绩效 / 30-Day Performance

柱状图展示过去 30 天的组合绩效变化趋势。

---

## 7. 指数 ETF / Index ETF

58 个指数覆盖国家队、位置、大陆和全明星。

58 indices covering national squads, positions, continents, and the all-star basket.

### 指数分类 / Index Categories

| 类别 / Category | 数量 / Count | 示例 / Example |
|---|---|---|
| 国家 / National | 48 | 🇧🇷 巴西队、🇦🇷 阿根廷队 |
| 位置 / Position | 4 | ⚡ 全前锋、🎯 全中场 |
| 大陆 / Continental | 5 | 🇪🇺 欧洲指数、🌎 南美指数 |
| 全明星 / All-Star | 1 | 🌟 全明星指数 |

### 筛选标签 / Filter Tabs

点击顶部标签切换查看不同分类的指数。

### 铸造操作 / Mint

1. 选择指数
2. 输入数量
3. 查看篮子预览（成分代币及权重）
4. 点击 `铸造指数 / Mint Index`

### 赎回操作 / Redeem

1. 选择指数代币
2. 输入赎回数量
3. 查看单位净值（NAV）和将收到的篮子
4. 点击 `赎回为篮子 / Redeem to Basket`

---

## 8. 绩效预言机 / Performance Oracle

真实比赛数据通过预言机推送上链，触发分红分配。

Real match stats are pushed on-chain via the oracle, triggering dividend distributions.

### 数据类型及奖励 / Stat Types & Rewards

| 类型 / Type | 图标 | 奖励 / Reward |
|---|---|---|
| 进球 / Goal | ⚽ | +50 mUSDT |
| 助攻 / Assist | 🅰️ | +25 mUSDT |
| 零封 / Clean Sheet | 🧤 | +20 mUSDT |
| 全场最佳 / MOTM | 🏆 | +30 mUSDT |

### 操作步骤 / Steps

1. 选择球员
2. 选择数据类型（点击对应卡片）
3. 点击 `推送数据上链 / Push Stats On-Chain`

### 最近分配 / Recent Distributions

右侧面板实时显示最近的分红分配记录，包括事件类型、球员、奖励金额和时间。

---

## 9. 排行榜 / Leaderboard

五个维度的排名，可通过标签切换。

Rankings across five dimensions, switchable via tabs.

| 标签 / Tab | 内容 / Content |
|---|---|
| 涨幅榜 / Top Gainers | 24小时涨幅最高的球员 |
| 市值榜 / Market Cap | 市值最高的球员 |
| 巨鲸持仓 / Whale Holdings | 持仓量最大的地址 |
| 分红排行 / Dividend Earners | 累计分红最高的球员 |
| 推荐排行 / Top Referrals | 推荐奖励最高的地址 |

前三名分别以 🥇金、🥈银、🥉铜 徽章标识。

---

## 10. 测试网水龙头 / Testnet Faucet

获取免费的 mUSDT 测试代币以开始交易。

Get free mUSDT test tokens to start trading.

### 操作步骤 / Steps

1. 输入钱包地址（以 `0x` 开头）
2. 点击 `领取 / Request`
3. 每次领取 **10,000 mUSDT**
4. 交易回执弹窗显示确认信息

### 最近领取记录 / Recent Claims

面板底部显示最近的水龙头领取记录。

---

## 11. 系统架构 / Architecture

### 系统架构图 / System Diagram

交互式架构图展示各合约之间的关系：

- **MockUSDT** → ERC-20 测试稳定币
- **PlayerTokenFactory** → EIP-1167 代理克隆工厂
- **PlayerToken** → 带分红累加器的 ERC-20
- **PlayerMarket** → 联合曲线交易
- **PlayerAMM** → 恒定乘积 AMM
- **PerformanceOracle** → 比赛数据预言机
- **IndexVault** → ETF 篮子

### 已部署合约 / Deployed Contracts

| 合约 / Contract | 地址 / Address |
|---|---|
| MockUSDT | `0x4F51c373145bdd8F3EFbD90f4c3409CC2f1Ea851` |
| PlayerTokenFactory | `0x8d2b077ca39CaAdBE6a659128943106e784D8BD7` |
| PlayerToken (impl) | `0xA177d2c0669eD77FF2FED4e820412fB6b9643364` |
| PlayerMarket | `0xd98B4e5296c66aE56c55C5A4c1e9EB0DD512196f` |
| PerformanceOracle | `0xF1277da9b1F4b7b72A3A16EC8C17a00Ce702C056` |

点击 `Copy` 按钮可复制合约地址。

### 技术栈 / Tech Stack

| 技术 / Technology | 用途 / Purpose |
|---|---|
| Solidity 0.8.24 | 智能合约 |
| Foundry | 构建与测试框架 |
| Next.js 14 | React 前端 |
| wagmi v2 + viem | Web3 hooks |
| RainbowKit | 钱包连接 |
| X Layer Testnet | OKX L2 (Chain 195) |
| PostgreSQL | 索引器数据库 |
| DeepSeek V4 | AI 研究台 |
| Turborepo | Monorepo 编排 |
| OKX DEX API | 价格聚合 |

---

## 12. 演示钱包 / Demo Wallets

两个预充值的测试钱包，可直接使用。

Two pre-funded test wallets, ready to use.

| 钱包 / Wallet | 地址 / Address |
|---|---|
| Wallet A | `0xd247daedd814c471537067452ed440f74c36f4d1` |
| Wallet B | `0x58ee540b3d333f629424d522d95f24b610d35af5` |

### 操作 / Actions

- **复制地址 / Copy Address** — 点击复制钱包地址
- **签名交易 / Sign Tx** — 模拟交易签名流程，显示签名结果弹窗

两个钱包都有足够的测试 OKB 和 mUSDT。

---

## 13. 语言切换 / Language Toggle

### 操作 / How to Switch

在页面右上角导航栏找到 **EN | 中文** 切换按钮：

- 点击 **EN** → 切换到英文界面
- 点击 **中文** → 切换到中文界面

语言切换是即时的，所有 11 个板块的文字、按钮、表格标题、弹窗内容都会同步更新。

The language toggle is instant — all 11 sections, buttons, table headers, and modal content update simultaneously.

---

## 快速导航 / Quick Navigation

网站顶部导航栏提供快速跳转：

| 导航项 / Nav Item | 板块 / Section |
|---|---|
| 市场 / Market | 球员市场 |
| 交易 / Trade | 交易面板 |
| AMM | AMM 流动池 |
| 投资组合 / Portfolio | 持仓管理 |
| 指数 / Indices | ETF 指数 |
| 预言机 / Oracle | 绩效预言机 |
| 排行榜 / Board | 排行榜 |
| 水龙头 / Faucet | 测试网水龙头 |
| 架构 / Arch | 系统架构 |

导航栏在滚动时自动变为半透明毛玻璃效果。

---

## 相关链接 / Links

- **演示网站 / Demo**: [https://ln6j8wpg.mule.page/](https://ln6j8wpg.mule.page/)
- **GitHub**: [https://github.com/CryptoPothunter/kickstock](https://github.com/CryptoPothunter/kickstock)
- **OKLink 浏览器**: [https://www.oklink.com/xlayer-test](https://www.oklink.com/xlayer-test)
- **网络 / Network**: X Layer Testnet (Chain ID: 195)
