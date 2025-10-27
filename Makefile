# Common dependencies
SRC := *.go go.mod go.sum

# Default target
vantage-mcp-server: $(SRC)
	go build -o vantage-mcp-server

inspect: vantage-mcp-server
	@npx @modelcontextprotocol/inspector@0.16.5 -e MCP_LOG_FILE=application.log -e VANTAGE_BEARER_TOKEN=${VANTAGE_BEARER_TOKEN} ./vantage-mcp-server

# macOS build (ARM64)
vantage-mcp-server-macos-arm64: $(SRC)
	GOOS=darwin GOARCH=arm64 go build -o vantage-mcp-server-macos-arm64

# Linux builds (multi-architecture)
vantage-mcp-server-linux-amd64: $(SRC)
	GOOS=linux GOARCH=amd64 go build -o vantage-mcp-server-linux-amd64

vantage-mcp-server-linux-arm64: $(SRC)
	GOOS=linux GOARCH=arm64 go build -o vantage-mcp-server-linux-arm64

# Windows builds (multi-architecture)
vantage-mcp-server-windows-amd64.exe: $(SRC)
	GOOS=windows GOARCH=amd64 go build -o vantage-mcp-server-windows-amd64.exe

vantage-mcp-server-windows-arm64.exe: $(SRC)
	GOOS=windows GOARCH=arm64 go build -o vantage-mcp-server-windows-arm64.exe

# Backward compatibility aliases
vantage-mcp-server-macos: vantage-mcp-server-macos-arm64
vantage-mcp-server-linux: vantage-mcp-server-linux-amd64
vantage-mcp-server-windows.exe: vantage-mcp-server-windows-amd64.exe

build-all: vantage-mcp-server-macos-arm64 vantage-mcp-server-linux-amd64 vantage-mcp-server-linux-arm64 vantage-mcp-server-windows-amd64.exe vantage-mcp-server-windows-arm64.exe
