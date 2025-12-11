import { html } from "hono/html";

export default function homepage() {
	const docsUrl = "https://docs.vantage.sh/vantage_mcp/";

	return html`
            <!DOCTYPE html>
            <html lang="en">
                <head>
                    <meta charset="UTF-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <title>Vantage Remote MCP Server</title>
                    <style>
                        :root {
                            --primary-color: #872EE1;
                            --text-color: #333;
                            --background-color: #f7f7f7;
                            --card-background: #ffffff;
                            --border-color: #e0e0e0;
                            --danger-color: #ef233c;
                            --success-color: #2a9d8f;
                            --font-family:
                                -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue',
                                sans-serif;
                        }
    
                        body {
                            font-family: var(--font-family);
                            background-color: var(--background-color);
                            color: var(--text-color);
                            margin: 0;
                            padding: 0;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            min-height: 100vh;
                        }
    
                        .container {
                            width: 100%;
                            max-width: 480px;
                            padding: 20px;
                        }
    
                        .card {
                            background-color: var(--card-background);
                            border-radius: 12px;
                            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                            padding: 32px;
                            overflow: hidden;
                        }
    
                        .header {
                            text-align: center;
                            margin-bottom: 24px;
                        }
    
                        .app-logo {
                            width: 40px;
                            height: 40px;
                            object-fit: contain;
                            border-radius: 8px;
                            margin-bottom: 16px;
                        }
                        .app-logo.shadow {
                            border-radius: 80px;
                            background: var(--background-color, #FFF);
                            box-shadow: 0px 5px 12px 0px rgba(0, 0, 0, 0.10);
                        }
    
                        h1 {
                            font-size: 20px; 
                        }
    
                        .app-link {
                            color: var(--primary-color);
                            text-decoration: none;
                            font-size: 14px;
                        }
    
                        .app-link:hover {
                            text-decoration: underline;
                        }

                        a.btn {
                            text-decoration: none;
                        }

                        .description {
                            margin: 24px 0;
                            font-size: 16px;
                            line-height: 1.5;
                        }
                        .description:first-of-type {
                            margin: 0 0 24px 0;
                        }
    
                        .scopes {
                            background-color: var(--background-color);
                            border-radius: 8px;
                            padding: 16px;
                            margin: 24px 0;
                        }
    
                        .scope-title {
                            font-weight: 600;
                            margin-bottom: 8px;
                            font-size: 15px;
                        }
    
                        .scope-list {
                            font-size: 16px;
                            margin: 0;
                            padding-left: 20px;
                        }
    
                        .actions {
                            display: flex;
                            gap: 12px;
                            margin-top: 24px;
                        }
    
                        .btn {
                            flex: 1;
                            padding: 12px 20px;
                            font-size: 16px;
                            font-weight: 500;
                            border-radius: 8px;
                            cursor: pointer;
                            border: none;
                            transition: all 0.2s ease;
                        }
    
                        .btn-cancel {
                            background-color: transparent;
                            border: 1px solid var(--border-color);
                            color: var(--text-color);
                        }
    
                        .btn-cancel:hover {
                            background-color: rgba(0, 0, 0, 0.05);
                        }
    
                        .btn-approve {
                            color:  var(--background-color);
                            border-radius: 6px;
                            border: 0px solid var(--primary-color);
                            background: var(--primary-color);
                        }
    
                        .btn-approve:hover {
                            background: var(--primary-color);
                        }
    
                        .security-note {
                            margin-top: 24px;
                            font-size: 12px;
                            color: #777;
                            text-align: center;
                        }
    
                        @media (max-width: 520px) {
                            .container {
                                padding: 10px;
                            }
    
                            .card {
                                padding: 24px;
                                border-radius: 8px;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="card">
                            <div class="header">
                                <h1>Vantage Remote MCP Server</h1>
                            </div>
                            <div class="header">
                                <img src="/vantage-logo.svg" alt="Vantage logo" class="shadow app-logo" />
                                <img src="/line.svg" alt="line" class="app-logo" />
                                <img src="/mcp-logo.png" alt="Model Context Protocol logo" class="shadow app-logo" />
                            </div>
    
                            <p class="description">
                                With the Vantage MCP (Model Context Protocol), you can use natural language to explore your organization’s cloud costs via MCP clients, like Claude, Cursor, Goose, and others.
                            </p>
    
                            <p class="description">
                                <a href="${docsUrl}"class="btn btn-approve">Learn more about Vantage MCP</a>
                            </p>
                        </div>
                    </div>
                </body>
            </html>
        `;
}
