# SvelteStack

An open-source, production-ready starter kit for building modern full-stack applications with SvelteKit.

SvelteStack comes with **Vault**, a fully-functional demo application showcasing file storage and workspace management, demonstrating best practices and real-world implementation patterns.

## About Vault (Demo App)

Vault is the reference application included with SvelteStack, demonstrating how to build a production-ready file storage and workspace management system. Use it as a starting point for your own application or as a learning resource.

### Vault Features

**Authentication**

- Email/password registration and login
- Secure password hashing with Argon2
- Session management with better-auth

**Workspace Management**

- Create and organize workspaces
- Rename and manage workspace settings
- Multi-tenant workspace isolation

**File Storage**

- Drag-and-drop file upload
- Direct S3 upload with presigned URLs
- Progress tracking and error handling with Uppy
- File organization by workspace

## What's Included

- 🔐 **Authentication System** - Complete auth setup with better-auth (email/password, sessions)
- 🗄️ **Database Integration** - PostgreSQL with Drizzle ORM, migrations, and seeding
- ☁️ **File Upload** - S3-compatible storage with presigned URLs and Uppy integration
- 🎨 **Modern UI Kit** - Pre-configured Tailwind CSS with shadcn-svelte components
- 📁 **Demo Application (Vault)** - Full workspace and file management example
- ✅ **Testing Setup** - Vitest with browser mode for component testing

## Prerequisites

- [Bun](https://bun.sh/) >= 1.0
- Node.js >= 20
- [Docker](https://www.docker.com/) with Docker Compose (for local database)

## Getting Started

### Quick Start

```bash
git clone https://github.com/vsamarth/sveltestack.git
cd sveltestack
bash scripts/setup.sh
```

The setup script will:

- Check all prerequisites (Node.js, Bun, Docker)
- Install dependencies
- Create `.env` file with generated secrets
- Start the database
- Run migrations
- Optionally seed sample data

Once setup is complete, start the development server:

```bash
bun dev
```

Visit [http://localhost:5173](http://localhost:5173) to see your app.

## Building Your Own App

SvelteStack is designed to be customized. You can:

1. **Start Fresh** - Remove the Vault demo and build from the foundation
2. **Extend Vault** - Add features to the existing demo application
3. **Learn & Reference** - Study the implementation patterns and apply them to your project

Key areas to customize:

- Replace Vault branding with your own
- Modify database schemas in `src/lib/server/db/schema.ts`
- Update UI components in `src/lib/components`
- Add your own API routes in `src/routes/api`

## Deployment

### Build for production

```bash
bun build
```

### Environment Variables

Ensure all production environment variables are set:

- `DATABASE_URL` - Production PostgreSQL connection string
- `BETTER_AUTH_SECRET` - Secure random string
- `BETTER_AUTH_URL` - Production URL
- S3 credentials for file storage

## License

MIT - Feel free to use this starter kit for personal or commercial projects.

## Acknowledgments

- [SvelteKit](https://kit.svelte.dev/)
- [shadcn-svelte](https://www.shadcn-svelte.com/)
- [better-auth](https://www.better-auth.com/)
- [Drizzle ORM](https://orm.drizzle.team/)
