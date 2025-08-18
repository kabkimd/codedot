# File Manager Agent Instructions

## Repository Overview

This is a React-based file management application built with modern web technologies. The application allows authenticated users to browse, edit, and manage files in their personal directories.

## Architecture

### Frontend Stack
- **React 18** with TypeScript
- **Vite** as build tool
- **Tailwind CSS** for styling with a minimal design system
- **shadcn/ui** for UI components
- **CodeMirror 6** for code editing with full features
- **Lucide React** for icons
- **React Router** for navigation

### Backend Integration
The application currently uses:
- MySQL for User authentication
- File storage and management
- Database operations
- Edge functions for file operations

## Key Components

### Authentication (`src/components/LoginForm.tsx`)
- Handles user login with username/password

### File Management (`src/components/FileManager.tsx`)
- Main application container
- Manages file system state
- Coordinates between file tree and editor

### File Tree (`src/components/FileTree.tsx`)
- Hierarchical file browser
- Context menu for CRUD operations
- Drag & drop file upload support
- File type icons

### Code Editor (`src/components/CodeEditor.tsx`)
- Full-featured CodeMirror 6 implementation
- Syntax highlighting for multiple languages
- Search/replace functionality
- Auto-save capabilities
- Download functionality

### Media Preview (`src/components/MediaPreview.tsx`)
- Previews non-editable files (images, videos, audio)
- Fallback for unsupported file types
- Download functionality

### File Icons (`src/components/FileIcon.tsx`)
- Dynamic icons based on file extensions
- Separate styling for directories vs files

## Design System

### Color Scheme
- **Background**: Pure white (`#ffffff`)
- **Foreground**: Pure black (`#000000`)
- **Accent**: Pale violet red (`hsl(340, 60%, 65%)`)
- **Borders**: 1px solid borders throughout

### Typography
- System fonts for UI
- Monospace fonts for code editor
- Minimal font weights and sizes

## File Structure

```
src/
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── CodeEditor.tsx        # Code editing
│   ├── FileIcon.tsx          # File type icons
│   ├── FileManager.tsx       # Main app container
│   ├── FileTree.tsx          # File browser
│   ├── LoginForm.tsx         # Authentication
│   ├── MediaPreview.tsx      # Media file preview
│   ├── ScrollingText.tsx     # Bulletin Board System with scrolling text
│   ├── SimpleContextMenu.tsx # Context menu for file tree
│   └── ThemeToggle.tsx       # toggle dark/light theme
├── pages/
│   ├── ForgotPassword.tsx  # Forgot psw form
│   ├── Index.tsx           # Main page
│   ├── NotFound.tsx        # 404 page
│   ├── Profile.tsx         # Profile page
│   └── ResetPassword.tsx   # Password reset page
├── templates/
│   └── p5js.ts             # p5js template
├── hooks/
│   ├── use-mobile.tsx      # Mobile handling
│   ├── use-orientation.tsx # Portrait/Landscape handling
│   └── use-toast.ts        # Toast notifications
└── lib/
    ├── api.ts              # api routing
    └── utils.ts            # Utilities
```

## For Custom Backend

On Debian 11 server:

### Backend Requirements

Create a REST API server that provides these endpoints:

#### Authentication
```
POST /api/auth/login
Body: { username: string, password: string }
Response: { user: User, token: string }

POST /api/auth/logout
Headers: { Authorization: "Bearer <token>" }
```

#### File Operations
```
GET /api/files/:username/*path
Headers: { Authorization: "Bearer <token>" }
Response: { content: string } | { tree: FileNode[] }

PUT /api/files/:username/*path
Headers: { Authorization: "Bearer <token>" }
Body: { content: string }

POST /api/files/:username/*path
Headers: { Authorization: "Bearer <token>" }
Body: FormData (for uploads) | { name: string, isDirectory: boolean }

DELETE /api/files/:username/*path
Headers: { Authorization: "Bearer <token>" }

PATCH /api/files/:username/*path
Headers: { Authorization: "Bearer <token>" }
Body: { newName: string }
```

### File System Structure

Organize user files on your server:
```
/var/www/tdl/
├── user0/
├── user1/
├── user2/
└── ...
```

### Implementation Steps

**Create API Server**
   ```bash
   # Example with Node.js/Express
   npm init -y
   npm install express cors helmet bcrypt jsonwebtoken multer
   ```

**User Management**
   - Store user credentials in sql database
   - Hash passwords with bcrypt
   - Issue JWT tokens for authentication

**File Operations**
   - Use Node.js `fs` module for file system operations
   - Validate paths to prevent directory traversal
   - Handle file uploads with multer

**Nginx Configuration**
   ```nginx
   server {
       listen 80;
       server_name filemanager.yourdomain.com;
       
       location /api/ {
           proxy_pass http://localhost:3001;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
       
       location / {
           root /var/www/filemanager/dist;
           try_files $uri $uri/ /index.html;
       }
   }
   ```

### Frontend

- `src/components/LoginForm.tsx` - Update authentication
- `src/components/FileManager.tsx` - Update file operations
- `src/components/FileTree.tsx` - Update CRUD operations

Example API service:
```typescript
// src/lib/api.ts
const API_BASE = '/api';

export const authAPI = {
  login: async (username: string, password: string) => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return response.json();
  }
};

export const fileAPI = {
  getFile: async (path: string) => {
    const response = await fetch(`${API_BASE}/files${path}`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    return response.json();
  },
  
  saveFile: async (path: string, content: string) => {
    const response = await fetch(`${API_BASE}/files${path}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ content })
    });
    return response.json();
  }
};
```

### Security Considerations

- Validate all file paths server-side
- Implement proper authentication middleware
- Use HTTPS in production
- Set up CORS properly
- Limit file upload sizes
- Sanitize file names
- Implement rate limiting

### Deployment

1. Build the React app: `npm run build`
2. Copy `dist/` to `/var/www/filemanager/`
3. Start your API server
4. Configure Nginx
5. Set up SSL with Let's Encrypt

## Development

To run locally:
```bash
npm install
npm run dev
```

To build for production:
```bash
npm run build
```