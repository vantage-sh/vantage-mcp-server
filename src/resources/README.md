# Vantage MCP Resources

This directory contains the resources subsystem for the Vantage MCP Server, which exposes Vantage documentation as MCP (Model Context Protocol) resources accessible via the `file://vantage/` URI scheme.

## Table of Contents

- [Overview](#overview)
- [How It Works](#how-it-works)
- [The `file://vantage/` URI Scheme](#the-filevantage-uri-scheme)
- [Directory Structure](#directory-structure)
- [Adding New Resources](#adding-new-resources)
- [Frontmatter Format](#frontmatter-format)
- [Development Workflow](#development-workflow)

## Overview

The resources system provides a way to expose Vantage documentation (particularly VQL documentation) as MCP resources. These resources are automatically discovered, indexed, and registered with the MCP server, making them accessible to AI assistants and other MCP clients through standardized URIs.

## How It Works

The resources system follows a build-time generation pattern:

```
┌─────────────────┐
│ Markdown Files  │
│  (vql/*.md)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   generateIndex │ ← Scans directory recursively
│    (build step) │   Extracts frontmatter
└────────┬────────┘   Creates Map entries
         │
         ▼
┌─────────────────┐
│   index.ts      │ ← Auto-generated TypeScript
│  (Map + wrapMap)│   Contains all resources
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    wrapMap      │ ← Registers resources with MCP
│  (runtime init) │   Creates file://vantage/ URIs
└─────────────────┘
```

### Step-by-Step Process

1. **Source Files**: Markdown documentation files are stored in subdirectories (e.g., `vql/`)
2. **Build Script**: `npm run generate-resources-index` scans all `.md` files (excluding `README.md`)
3. **Index Generation**: Creates `index.ts` with a Map of all resources and their content
4. **Registration**: At runtime, `wrapMap()` registers each resource with the MCP server
5. **Access**: Resources become available via `file://vantage/` URIs

## What is Bootstrapping?

**Bootstrapping** in this context refers to the automated code generation process that "pulls itself up" from simple markdown files to a fully functional MCP resource registry.

### The Bootstrapping Process

The bootstrapping system consists of three main components:

#### 1. `generateIndex.ts`
The core generation logic that:
- Recursively scans the `src/resources/` directory
- Identifies all `.md` files (except `README.md`)
- Extracts YAML frontmatter (title, description)
- Escapes content for safe embedding in TypeScript strings
- Generates TypeScript code with proper typing

#### 2. `generate-resources-index.ts` (CLI Script)
The entry point that:
- Determines the correct directory path
- Invokes `generateIndex()` with the path
- Writes the generated code to `index.ts`
- Reports completion

#### 3. `wrapMap.ts`
The runtime wrapper that:
- Takes the generated Map of resources
- Returns a registration function
- Registers each resource with the MCP server
- Sets up URI routing and metadata

## The `file://vantage/` URI Scheme

All resources in this system are accessible via the `file://vantage/` URI scheme.

### URI Format

```
file://vantage/{relative-path-from-resources-dir}
```

### Examples

| File Path | URI |
|-----------|-----|
| `vql/index.md` | `file://vantage/vql/index.md` |
| `vql/cost_report.md` | `file://vantage/vql/cost_report.md` |
| `vql/resource_report.md` | `file://vantage/vql/resource_report.md` |

## Adding New Resources

To add a new resource to the system:

### 1. Create Your Markdown File

```bash
touch src/resources/vql/new_report.md
```

### 2. Add Frontmatter (Optional but Recommended)

```markdown
---
title: VQL for New Report Type
description: "Learn how to use VQL when querying New Reports in Vantage."
---

# VQL for New Report Type

Your content here...
```

### 3. Regenerate the Index

```bash
npm run generate-resources-index
```

### 4. Verify

The resource will now be available at:
```
file://vantage/vql/new_report.md
```

**That's it!** The resource is now automatically:
- ✅ Included in `index.ts`
- ✅ Registered with the MCP server
- ✅ Accessible via its URI
- ✅ Typed in TypeScript

## Frontmatter Format

Markdown files can include YAML frontmatter for metadata:

```yaml
---
title: Your Resource Title
description: "A brief description of the resource"
---
```

### Supported Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | No | Display title for the resource |
| `description` | string | No | Brief description (used by MCP clients) |

### Parsing Rules

- Frontmatter must be at the very start of the file
- Must be wrapped in `---` delimiters
- Fields can be quoted or unquoted
- JSON-style quoting is supported: `description: "My \"quoted\" value"`

### Example with Frontmatter

```markdown
---
title: VQL for Cost Reports
description: "Learn how to use VQL when querying Cost Reports in Vantage."
---

# VQL for Cost Reports

VQL comprises two namespaces: `costs` and `tags`...
```

### Example without Frontmatter

```markdown
# VQL for Cost Reports

VQL comprises two namespaces: `costs` and `tags`...
```

Both are valid! Frontmatter is optional but improves the resource metadata.

## Development Workflow

### Running the Generator

```bash
# Generate the resources index
npm run generate-resources-index
```

This script:
1. Scans `src/resources/` for `.md` files
2. Extracts frontmatter and content
3. Generates `src/resources/index.ts`
4. Reports completion

### Testing Changes

```bash
# Run all tests
npm run test

# Run with coverage
npm run test -- --coverage

# Watch mode for development
npm run test -- --watch
```

## Important Notes

### DO NOT Edit `index.ts` Directly

The `index.ts` file is **auto-generated**. Any manual changes will be overwritten the next time you run `npm run generate-resources-index`.

**Instead:**
1. Edit the source markdown files
2. Run the generation script
3. Commit both the markdown files and the updated `index.ts`

### Escaping Special Characters

The generator automatically escapes:
- Backticks (`` ` ``) → `` \` ``
- Backslashes (`\`) → `\\`

This ensures content can be safely embedded in TypeScript template literals.

### File Naming

- Use lowercase with underscores: `cost_report.md` ✅
- Avoid spaces: `cost report.md` ❌
- Use `.md` extension: `cost_report.txt` ❌
- Avoid special characters except `_`, `-`: `cost&report.md` ❌

### Nested Directories

You can create nested directories for organization:

```
vql/
├── index.md
├── reports/
│   ├── cost_report.md
│   └── resource_report.md
└── advanced/
    └── custom_queries.md
```

These will generate URIs like:
- `file://vantage/vql/reports/cost_report.md`
- `file://vantage/vql/advanced/custom_queries.md`

---

## Contributing

When adding new resources:
1. Follow the existing structure and naming conventions
2. Include frontmatter with meaningful titles and descriptions
3. Run `npm run generate-resources-index` before committing
4. Add tests if adding new bootstrapping utilities
