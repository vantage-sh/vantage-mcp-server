
vantage-mcp-server: *.go go.mod go.sum
	go build -o vantage-mcp-server

inspect: vantage-mcp-server
	npx @modelcontextprotocol/inspector@0.8.0 -e MCP_LOG_FILE=application.log -e VANTAGE_BEARER_TOKEN=$VANTAGE_BEARER_TOKEN ./vantage-mcp-server

vantage-mcp-server-macos: *.go go.mod go.sum
	GOOS=darwin GOARCH=arm64 go build -o vantage-mcp-server-macos
vantage-mcp-server-linux: *.go go.mod go.sum
	GOOS=linux GOARCH=amd64 go build -o vantage-mcp-server-linux
vantage-mcp-server-windows: *.go go.mod go.sum
	GOOS=windows GOARCH=amd64 go build -o vantage-mcp-server-windows.exe

build-all: vantage-mcp-server-macos vantage-mcp-server-linux vantage-mcp-server-windows
