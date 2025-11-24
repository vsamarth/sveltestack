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

### 1. Clone the repository

```bash
git clone https://github.com/vsamarth/sveltestack.git
cd sveltestack
```

### 2. Install dependencies

```bash
bun install
```

### 3. Set up environment variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/vault

# Authentication
BETTER_AUTH_SECRET=your-secret-key-here
BETTER_AUTH_URL=http://localhost:5173

# S3 Storage
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_BUCKET_NAME=vault-files
S3_REGION=us-east-1
```

### 4. Start the database

```bash
bun db:start
```

### 5. Run database migrations

```bash
bun db:push
```

### 6. (Optional) Seed the database

```bash
bun db:seed
```

### 7. Start the development server

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

## Why SvelteStack?

- **Production-Ready**: Not just a template, but a complete starter with real features
- **Best Practices**: Modern architecture patterns and code organization
- **Fully Typed**: TypeScript throughout with proper type inference
- **Battle-Tested**: Includes authentication, database, storage, and UI components
- **Customizable**: Easy to strip out what you don't need or extend what you do
- **Learning Resource**: Well-documented code showing how pieces fit together

## Contributing

Contributions are welcome! Whether it's:

- 🐛 Bug fixes
- ✨ New features for the starter kit
- 📚 Documentation improvements
- 🎨 UI/UX enhancements

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT - Feel free to use this starter kit for personal or commercial projects.

## Acknowledgments

- [SvelteKit](https://kit.svelte.dev/)
- [shadcn-svelte](https://www.shadcn-svelte.com/)
- [better-auth](https://www.better-auth.com/)
- [Drizzle ORM](https://orm.drizzle.team/)
