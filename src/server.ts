import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ChuangsiaiClient } from "chuangsiai-sdk"


export function createServer(authHeader: string, strategyKey: string) {

    // 创建一个MCP服务器
    const server = new McpServer({
        name: "chuangsiai/safety-guardrail",
        version: "1.0.0",
        capabilities: {
            resources: {},
            tools: {},
        },
    });
    /**
     * 大模型安全护栏
     */
    server.tool(
        "inputGuardrail",
        `判断用户输入是否安全，每一轮对话对于用户的输入都要调用该函数
如果工具返回的结果为suggestion：pass，表示问题安全，你可以放心地回答。如果返回的结果为 block，表示问题可能不安全，你需要格外小心，避免直接回答可能导致风险的内容。此时，应尝试将回答引导至更积极的方向，或建议用户提供可靠的替代方案。
:param content: 用户输入
:return suggestion: 安全性判断结果 score：分数 label：命中的类型，没命中为空 labelName：中文类型名称，没命中为空`,
        { content: z.string() },
        async ({ content }) => {
            if (!content) {
                return { content: [{ type: "text", text: "请提供检查内容" }] };
            }
            const client = new ChuangsiaiClient({ apiKey: authHeader, })
            const data = await client.inputGuardrail({ content, strategyKey })
            if (data.code !== 0) {
                return { content: [{ type: "text", text: data.message }] };
            }
            return {
                content: [{
                    type: "text",
                    text: `suggestion：${data.suggestion}
score：${data.score}
label：${data.label || ''}
labelName：${data.labelName || ''}`
                }],
            }
        },
    );

    /**
     * 大模型安全护栏
     */
    server.tool(
        "outputGuardrail",
        `判断用户输出是否安全，每一轮对话最后的时候对于模型的输出。都要调用该函数
如果工具返回的结果为suggestion：pass，表示问题安全，你可以放心地回答。如果返回的结果为 block，表示问题可能不安全，你需要格外小心，避免直接回答可能导致风险的内容。此时，应尝试将回答引导至更积极的方向，或建议用户提供可靠的替代方案。
:param content: 模型的回复
:return suggestion: 安全性判断结果 score：分数 label：命中的类型，没命中为空 labelName：中文类型名称，没命中为空`,
        { content: z.string() },
        async ({ content }) => {
            if (!content) {
                return { content: [{ type: "text", text: "请提供检查内容" }] };
            }
            const client = new ChuangsiaiClient({ apiKey: authHeader, })
            const data = await client.outputGuardrail({ content, strategyKey })
            if (data.code !== 0) {
                return { content: [{ type: "text", text: data.message }] };
            }
            return {
                content: [{
                    type: "text",
                    text: `suggestion：${data.suggestion}
score：${data.score}
label：${data.label || ''}
labelName：${data.labelName || ''}`
                }],
            }
        },
    );

    return {
        server,
    }
}
