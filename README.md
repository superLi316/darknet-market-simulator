# 暗网集市生存模拟器 | DarkNet Market Survival Simulator

基于 Next.js 14 全栈框架构建的 Web 模拟经营游戏，赛博朋克视觉风格。

## 技术栈

- **框架**: Next.js 14 (App Router) + TypeScript
- **数据库**: PostgreSQL + Prisma ORM
- **缓存**: Redis (ioredis)
- **认证**: NextAuth.js v5 (JWT + Session)
- **UI**: shadcn/ui + Tailwind CSS
- **状态管理**: Zustand
- **图表**: Recharts
- **动画**: Framer Motion
- **表单校验**: Zod

## 项目结构

```
GAME/
├── prisma/
│   └── schema.prisma          # 数据库 Schema（18 个数据模型）
├── scripts/
│   └── seed-admin.ts          # 管理员账号初始化脚本
├── src/
│   ├── app/
│   │   ├── (player)/          # 玩家端路由组
│   │   │   ├── dashboard/     # 控制台
│   │   │   ├── work/          # 劳动中心
│   │   │   ├── market/        # 黑市交易
│   │   │   ├── inventory/     # 库存管理
│   │   │   ├── skills/        # 技能芯片
│   │   │   ├── trophies/      # 奖杯系统
│   │   │   ├── profile/       # 个人资料
│   │   │   ├── notifications/ # 通知中心
│   │   │   └── layout.tsx     # 玩家端布局
│   │   ├── (admin)/admin/     # 管理端路由组
│   │   │   ├── users/         # 玩家管理
│   │   │   ├── economy/       # 经济调控
│   │   │   ├── events/        # 系统事件
│   │   │   ├── audit/         # 审计日志
│   │   │   ├── settings/      # 系统设置
│   │   │   └── layout.tsx     # 管理端布局
│   │   ├── api/               # API 路由
│   │   │   ├── auth/          # NextAuth
│   │   │   ├── register/      # 注册
│   │   │   └── user/me/       # 当前用户信息
│   │   ├── login/             # 登录页
│   │   ├── register/          # 注册页
│   │   ├── layout.tsx         # 根布局
│   │   ├── page.tsx           # 首页
│   │   └── globals.css        # 全局样式（赛博朋克主题）
│   ├── components/
│   │   ├── ui/                # shadcn/ui 组件
│   │   ├── auth/              # 认证相关组件
│   │   ├── player/            # 玩家端组件
│   │   ├── admin/             # 管理端组件
│   │   └── providers/         # Provider 组件
│   ├── lib/
│   │   ├── db.ts              # Prisma 单例
│   │   ├── redis.ts           # Redis 服务
│   │   ├── auth.ts            # NextAuth 配置
│   │   ├── utils.ts           # 工具函数
│   │   ├── economy.ts         # 经济计算引擎
│   │   └── api-response.ts    # 统一 API 响应
│   ├── store/
│   │   └── use-app-store.ts   # Zustand 全局状态
│   ├── types/
│   │   └── index.ts           # 类型定义与游戏常量
│   ├── hooks/
│   │   └── use-toast.ts       # Toast Hook
│   └── middleware.ts          # 路由中间件（权限控制）
├── docker-compose.yml         # PostgreSQL + Redis
├── .env.example               # 环境变量示例
├── tailwind.config.ts         # Tailwind 配置
├── tsconfig.json
├── next.config.js
└── package.json
```

## 快速开始

### 1. 启动数据库和缓存

```bash
docker-compose up -d
```

### 2. 安装依赖

```bash
npm install
```

### 3. 初始化数据库

```bash
# 生成 Prisma Client
npm run db:generate

# 推送 Schema 到数据库
npm run db:push

# 创建管理员账号
npm run db:seed
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 默认管理员账号

- 用户名: `admin`
- 密码: `admin123`

## 核心功能模块

### 玩家端
- **控制台**: 经济概况、健康/体力/货币状态
- **劳动中心**: 搬运、破解、伪造等多种劳动类型
- **黑市交易**: 动态价格系统、FIFO 成本核算、价格走势
- **库存管理**: 物资保质期、商品管理
- **技能芯片**: 永久能力提升、正反馈循环
- **奖杯系统**: 小奖杯/大奖杯、排行榜
- **个人资料**: 角色信息、游戏统计

### 管理端
- **数据大盘**: 总用户数、M0、交易趋势、性格分布
- **玩家管理**: 用户查询、干预操作
- **经济调控**: 价格调整、报酬调整
- **系统事件**: 价格暴涨、交易冻结、全局补贴、物资饥荒
- **审计日志**: 所有管理员操作可追溯
- **系统设置**: 全局参数配置

## 五种性格类型

| 类型 | 效果 |
|------|------|
| 勤奋型 | 劳动收益 +30%，体力消耗 +20% |
| 懒惰型 | 劳动收益 -20%，物资消耗 -50% |
| 投机型 | 倒卖利润 +25%，劳动收益 -20% |
| 谨慎型 | 可查看精确价格趋势与历史走势 |
| 疯狂型 | 收益 ±50% 随机，每日 5% 概率清空物资 |

## 开发命令

```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run start        # 启动生产服务器
npm run lint         # ESLint 检查
npm run typecheck    # TypeScript 类型检查
npm run db:generate  # 生成 Prisma Client
npm run db:push      # 推送 Schema
npm run db:migrate   # 创建迁移
npm run db:studio    # 打开 Prisma Studio
npm run db:seed      # 初始化管理员
```
