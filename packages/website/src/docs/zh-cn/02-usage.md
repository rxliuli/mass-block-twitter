# 如何使用

<!-- ## 视频教程 -->

## 操作仪表盘

点击扩展图标，即可显示扩展面板，首页显示了过去一周的统计数据。

![dashboard](/docs/dashboard.png)

操作仪表盘为您提供了以下功能:

- **数据概览**: 显示过去一周内过滤的推文数量和屏蔽的账号数量
- **每日趋势**: 通过图表直观展示每日过滤活动的变化趋势
- **最近操作**: 列出最近执行的屏蔽、静音和过滤操作
- **效果统计**: 分析不同过滤规则和列表的有效性

## 批量操作

批量操作功能让您能够一次性管理多个 Twitter 账号，提高内容管理效率。

### 批量屏蔽

1. 在扩展面板中点击"批量操作"选项卡
2. 在搜索框中输入关键字
3. 系统会显示符合条件的 Twitter 账号列表
4. 使用勾选框选择要屏蔽的账号
5. 点击"屏蔽所选用户"按钮执行批量屏蔽

![批量屏蔽](/docs/batch-block.png)

<!-- ### 批量取消屏蔽

1. 在批量操作页面切换到"已屏蔽"标签
2. 浏览或搜索您已屏蔽的账号列表
3. 选择要取消屏蔽的账号
4. 点击"取消屏蔽"按钮恢复这些账号 -->

### 高级筛选

批量操作支持多种高级筛选条件:

- 账号是否已屏蔽
- 是否为认证账号
- 是否已关注

通过组合使用这些条件，您可以精确定位可能的垃圾账号。

## 内容审核列表

> 该功能必须登录才能使用，使用邮箱即可注册。

内容审核列表是一种强大的社区内容管理工具，让用户可以创建和订阅各种过滤规则集合。

### 创建审核列表

1. 导航至 **Moderation Lists** 选项卡
2. 点击右上角的 **Create new list** 图标
3. 输入列表名称和描述
4. 保存后，您将进入列表详情页面

![创建审核列表](/docs/modlist-create.png)

### 添加用户到列表

审核列表中可以包含任意多的用户，订阅者会在匹配到这些用户时自动隐藏或屏蔽

1. 点击 **Add Users** 按钮
2. 搜索要添加的 Twitter 用户
3. 勾选相关用户(支持多选)
4. 点击 **Add** 确认

### 导入用户到列表

1. 点击 **Import Users** 按钮
2. 选择导入方式:
   - 从 CSV 文件导入
   - 从 JSON 文件导入

<iframe class="horizontal-video" src="https://www.youtube.com/embed/zqd9Hjg0JiA?si=dqowzG4FXEoUy844" title="Mass Block Twitter: Import Users from JSON/CSV in Moderation List" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

### 添加规则到列表

审核列表也允许添加灵活的匹配规则，例如根据用户名、描述、推文内容等，当匹配到特定规则时会自动隐藏或屏蔽。

1. 在审核列表详情页面，点击 Rules 标签页
2. 点击 **Add rule** 按钮
3. 选择匹配的字段，例如 **Username, Description, Tweet Text** 等
4. 设置匹配条件和应用范围
5. 保存规则到列表中

![add rule to moderation list](/docs/modlist-add-rule.png)

### 订阅他人的审核列表

1. 浏览 **Moderation Lists** 的公开审核列表
2. 点击感兴趣的列表查看详情
3. 点击 **Subscribe** 按钮
4. 选择应用方式:
   - Mute (仅隐藏内容)
   - Block (完全阻止互动)
5. 确认订阅

![订阅审核列表](/docs/modlist-subscribe.png)

您还可以订阅时选择是否立刻屏蔽，如果选择立刻屏蔽，则订阅后会立刻屏蔽列表中的所有用户。请注意，由于 Twitter API 速率限制，Twitter 可能会要求您重新登录。

<iframe class="horizontal-video" src="https://www.youtube.com/embed/ZhQNfv4SLGw?si=60tGBBG3CoOOBjKx" title="Mass Block Twitter: Import Users from JSON/CSV in Moderation List" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

### 分享审核列表

1. 在审核列表详情页面，点击右上角的菜单
2. 选择 **Copy Link to list** 按钮
3. 在任何地方粘贴该链接，即可分享给其他人

<iframe class="horizontal-video" src="https://www.youtube.com/embed/-5q6IfDV5LU?si=hjMi8YDxSG6wRcV8" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

### 管理订阅

在 **Subscribed** 部分，您可以:

- 查看所有已订阅的审核列表
- 修改应用方式(静音/屏蔽)
- 取消不再需要的订阅
<!-- - 查看每个列表的过滤效果统计 -->

## 一键屏蔽

一键屏蔽功能让您可以直接在 Twitter 界面上快速处理可疑账号，不需要二次确认或任何弹窗，它只是立刻屏蔽，屏蔽后相关推文将从您的时间线中移除。

![一键屏蔽](/docs/quick-block.png)

<!-- ### 识别机制

Mass Block Twitter 使用多种指标来识别可能的垃圾账号:

- 社区报告数据
- 账号创建时间
- 内容特征分析
- 行为模式识别
- 与已知垃圾账号的相似度 -->

## 关键词屏蔽

关键词屏蔽功能允许您基于特定词汇或短语自动过滤 Twitter 内容，并且允许自动执行 Block 操作。

### 设置关键词

1. 在扩展面板中点击 **Muted Words** 选项卡
2. 点击右上角的 **Add new word** 图标
3. 输入要屏蔽的关键词或短语
4. 选择应用范围:
   - 仅推文内容
   - 用户名
   - 用户简介
   - 用户地址
5. 选择操作方式:
   - 静音(隐藏内容)
   - 屏蔽(阻止账号)
6. 保存设置

![关键词屏蔽](/docs/keyword-filter.png)

### 管理关键词

您可以:

- 添加/删除特定关键词
- 编辑现有关键词的匹配条件
<!-- - 导入/导出关键词列表 -->

## 远程共享黑名单

远程共享黑名单是一个基于社区的功能，让用户可以共享已确认的垃圾账号信息。

### 启用共享黑名单

1. 在 "Settings > Filter Control > Hide Spam Accounts" 选项中
2. 切换开关以启用/禁用该功能（默认启用）

![远程黑名单](/docs/remote-blacklist.png)

### 参与贡献

当您浏览推文时，将会自动检查用户是否是 Spam 账号，如果确认是 Spam 账号，将会自动触发自动屏蔽并提交到共享黑名单数据库。您的贡献将帮助其他用户免受相同的垃圾内容困扰，可以随时选择退出共享黑名单功能。

### 什么是 Spam 账号

Spam 账号是指那些发布垃圾内容、广告、诈骗等垃圾信息的账号。但不包括那些发布政治内容的账号，如果您不喜欢他们，你可以在 Moderation Lists 中创建一个审核列表并和任何人分享。

## 设置

插件提供了丰富的自定义选项，以满足不同用户的需求。

### 一般设置

- **界面主题**: 选择浅色/深色/跟随系统
- **语言**: 选择扩展的语言

### 过滤设置

- **Hide Suspicious Accounts**: 隐藏可疑账号
- **Hide Spam Accounts**: 隐藏垃圾账号
- **Hide Mute Words**: 隐藏关键词
- **Hide Moderation Lists**: 隐藏审核列表
- **Hide Blue Verified Accounts**: 隐藏蓝标账号
- **Hide Languages**: 隐藏指定语言的推文

![设置页面](/docs/settings/filter-control.png)

<!--
### 数据管理

- **导入/导出**: 备份或迁移您的规则和设置
- **同步选项**: 配置跨设备同步行为
- **数据清理**: 清除本地缓存数据 -->

通过调整这些设置，您可以打造一个符合您使用习惯的 Twitter 净化工具。
