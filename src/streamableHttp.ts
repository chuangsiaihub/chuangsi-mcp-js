import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { InMemoryEventStore } from '@modelcontextprotocol/sdk/examples/shared/inMemoryEventStore.js';
import express, { Request, Response } from "express";
import { createServer } from "./server.js";
import { randomUUID } from 'node:crypto';

console.log('正在启动可流式HTTP服务器...');

const app = express();

// 存储会话ID与传输层的映射关系
const transports: Map<string, StreamableHTTPServerTransport> = new Map<string, StreamableHTTPServerTransport>();

// 处理MCP POST请求
app.post('/mcp', async (req: Request, res: Response) => {
    console.error('收到MCP POST请求');
    const authHeader = req.headers.authorization as string;
    const strategyKey = req.headers['strategykey'] as string;
    if (!authHeader || !strategyKey) {
        res.status(401).send("未提供授权头或策略标识");
        return;
    }
    try {
        // 检查是否存在会话ID
        const sessionId = req.headers['mcp-session-id'] as string | undefined;
        let transport: StreamableHTTPServerTransport;

        if (sessionId && transports.has(sessionId)) {
            // 重用现有的传输层
            transport = transports.get(sessionId)!;
        } else if (!sessionId) {
            // 创建新的服务器实例
            const { server, } = createServer(authHeader, strategyKey);

            // 新的初始化请求
            const eventStore = new InMemoryEventStore();
            transport = new StreamableHTTPServerTransport({
                sessionIdGenerator: () => randomUUID(),
                eventStore, // 启用可恢复性
                onsessioninitialized: (sessionId: string) => {
                    // 当会话初始化时按会话ID存储传输层
                    // 这样可以避免在会话存储前收到请求导致的竞态条件
                    console.error(`会话已初始化，ID: ${sessionId}`);
                    transports.set(sessionId, transport);
                }
            });

            // 处理关闭连接事件
            res.on("close", () => {
                console.log("客户端已断开连接: ", transport.sessionId);
                const sid = transport.sessionId;
                if (sid && transports.has(sid)) {
                    console.error(`传输层已关闭，会话 ${sid}，从传输映射中移除`);
                    transports.delete(sid);
                }
            });

            // 在处理请求前将传输层连接到MCP服务器
            // 这样响应可以通过同一个传输层返回
            await server.connect(transport);

            await transport.handleRequest(req, res);
            return; // 请求已处理
        } else {
            // 无效请求 - 没有会话ID或不是初始化请求
            res.status(400).json({
                jsonrpc: '2.0',
                error: {
                    code: -32000,
                    message: '错误请求: 未提供有效的会话ID',
                },
                id: req?.body?.id,
            });
            return;
        }

        // 使用现有传输层处理请求 - 无需重新连接
        // 现有传输层已经连接到服务器
        await transport.handleRequest(req, res);
    } catch (error) {
        console.error('处理MCP请求时出错:', error);
        if (!res.headersSent) {
            res.status(500).json({
                jsonrpc: '2.0',
                error: {
                    code: -32603,
                    message: '服务器内部错误',
                },
                id: req?.body?.id,
            });
            return;
        }
    }
});

// 处理SSE流的GET请求(使用StreamableHTTP内置支持)
app.get('/mcp', async (req: Request, res: Response) => {
    console.error('收到MCP GET请求');
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports.has(sessionId)) {
        res.status(400).json({
            jsonrpc: '2.0',
            error: {
                code: -32000,
                message: '错误请求: 未提供有效的会话ID',
            },
            id: req?.body?.id,
        });
        return;
    }

    // 检查Last-Event-ID头部以支持可恢复性
    const lastEventId = req.headers['last-event-id'] as string | undefined;
    if (lastEventId) {
        console.error(`客户端正在重新连接，Last-Event-ID: ${lastEventId}`);
    } else {
        console.error(`为会话 ${sessionId} 建立新的SSE流`);
    }

    const transport = transports.get(sessionId);
    await transport!.handleRequest(req, res);
});

// 处理会话终止的DELETE请求(根据MCP规范)
app.delete('/mcp', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports.has(sessionId)) {
        res.status(400).json({
            jsonrpc: '2.0',
            error: {
                code: -32000,
                message: '错误请求: 未提供有效的会话ID',
            },
            id: req?.body?.id,
        });
        return;
    }

    console.error(`收到会话终止请求，会话ID: ${sessionId}`);

    try {
        const transport = transports.get(sessionId);
        await transport!.handleRequest(req, res);
    } catch (error) {
        console.error('处理会话终止时出错:', error);
        if (!res.headersSent) {
            res.status(500).json({
                jsonrpc: '2.0',
                error: {
                    code: -32603,
                    message: '处理会话终止时出错',
                },
                id: req?.body?.id,
            });
            return;
        }
    }
});

// 启动服务器
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.error(`MCP可流式HTTP服务器正在监听端口 ${PORT}`);
});

// 处理服务器关闭
process.on('SIGINT', async () => {
    console.error('正在关闭服务器...');

    // 关闭所有活跃的传输层以正确清理资源
    for (const sessionId in transports) {
        try {
            console.error(`正在关闭会话 ${sessionId} 的传输层`);
            await transports.get(sessionId)!.close();
            transports.delete(sessionId);
        } catch (error) {
            console.error(`关闭会话 ${sessionId} 的传输层时出错:`, error);
        }
    }

    console.error('服务器关闭完成');
    process.exit(0);
});