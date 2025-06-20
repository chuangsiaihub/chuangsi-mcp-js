# 创思大模型安全 MCP

## 官网

https://chuangsiai.com

## 简介

创思大模型安全 MCP（Model Content Protection）是面向大语言模型的内容安全防护系统，通过实时风险识别与拦截，保障大模型应用的安全、合规与可信。

**核心能力**：

- 输入/输出内容双重安全检测
- 多维度风险识别（合规/伦理/安全）
- 低延迟实时防护
- 可定制策略引擎

## 快速接入

在配置文件中添加以下服务配置（支持 SSE 协议）：

```json
{
  "mcpServers": {
    "chuangsiai": {
      "name": "chuangsiai-mcp",
      "type": "sse", // 流式传输协议
      "baseUrl": "https://mcp.chuangsiai.com/sse",
      "headers": {
        "Authorization": "【你的API Key】",
        "StrategyKey": "【你的策略标识】"
      }
    }
  }
}
```

## 凭证获取步骤

1. 登录 创思安全控制台
2. 前往「[APIKey 管理](https://console.chuangsiai.com/#/profile/apiKey)」创建 API Key
3. 在「[策略中心](https://console.chuangsiai.com/#/modelSafety/safeGuard)」获取策略标识
4. 替换配置中的占位符 【】

## 技术特性

- **实时风险识别**：通过实时分析输入和输出内容，快速识别潜在的风险，如违规内容、伦理问题等。
- **多维度检测**：支持多种风险检测维度，包括但不限于合规性、伦理性和安全性。
- **低延迟**：采用 HTTPS 传输协议，确保低延迟的实时防护，满足实时性要求。
- **可定制策略引擎**：提供灵活的策略引擎，支持用户自定义风险检测规则和防护策略。

## 使用场景

- **内容审核**：实时监控和审核输入和输出内容，确保内容符合法律法规和社会主义核心价值观。

## 📬 联系我们

如需技术支持、企业合作或 API 接入，请联系：

- 邮箱: service@chuangsiai.com
- 官网: https://chuangsiai.com
- 控制台: https://console.chuangsiai.com
