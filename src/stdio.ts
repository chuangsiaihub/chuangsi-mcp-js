import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

console.log('Starting default (STDIO) server...');

async function main() {
    const transport = new StdioServerTransport();

    // 获取环境变量
    const env = process.env;
    const apiKey = env.API_KEY
    const strategyKey = env.STRATEGY_KEY;
    if (!apiKey || !strategyKey) {
        throw new Error("API_KEY 和 STRATEGY_KEY 环境变量必须设置");
    }
    const { server, } = createServer(apiKey, strategyKey);

    await server.connect(transport);

    // Cleanup on exit
    process.on("SIGINT", async () => {
        await server.close();
        process.exit(0);
    });
}

main().catch((error) => {
    console.log("Server error:", error);
    process.exit(1);
});
