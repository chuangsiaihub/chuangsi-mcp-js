import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import { createServer } from "./server.js";

console.log('正在启动SSE服务器...');

const app = express();

// 添加中间件解析 JSON 请求体
app.use(express.json());

// 添加日志中间件
app.use((req, _res, next) => {
    console.log(`[API]${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

const transports: Map<string, SSEServerTransport> = new Map<string, SSEServerTransport>();

app.get("/sse", async (req, res) => {
    const authHeader = req.headers.authorization as string;
    const strategyKey = req.headers['strategykey'] as string;
    if (!authHeader || !strategyKey) {
        res.status(401).send("未提供授权头或策略标识");
        return;
    }
    console.log(authHeader, strategyKey);

    const { server } = createServer(authHeader, strategyKey);

    let transport: SSEServerTransport;
    if (req?.query?.sessionId) {
        const sessionId = (req?.query?.sessionId as string);
        transport = transports.get(sessionId) as SSEServerTransport;
        console.log("客户端正在重新连接？这不应该发生；当客户端有会话ID时，不应再次调用GET/sse。", transport.sessionId);
    } else {
        // 为新会话创建和存储传输
        transport = new SSEServerTransport("/message", res);
        transports.set(transport.sessionId, transport);

        // 将服务器连接到传输
        await server.connect(transport);
        console.log("客户端已连接: ", transport.sessionId);

        // 处理关闭连接
        res.on("close", () => {
            console.log("客户端已断开连接: ", transport.sessionId);
            transports.delete(transport.sessionId);
        });
    }

});

app.post("/message", async (req, res) => {
    const sessionId = (req?.query?.sessionId as string);
    const transport = transports.get(sessionId) as SSEServerTransport;
    if (transport) {
        console.log("来自的客户端消息", sessionId);
        await transport.handlePostMessage(req, res, req.body);
        console.log("已处理来自客户端的消息", transports.keys());
    } else {
        console.log(`未找到会话ID的传输 ${sessionId}`)
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`服务器正在端口 ${PORT} 上运行`);
});