# Catastrophe Theory — Site Bundle

## Structure

```
repo/
├── index.html                  ← landing page (yourname.github.io/repo/)
├── .github/
│   └── workflows/
│       └── deploy.yml          ← auto-build + deploy on push to main
└── catastrophes-app/           ← Vite/React project
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        └── App.jsx             ← the catastrophes visualizer
```

## Setup (do this once)

### 1. Set your repo name in vite.config.js

Open `catastrophes-app/vite.config.js` and replace `YOUR_REPO_NAME`
with your actual GitHub repository name:

```js
base: '/your-actual-repo-name/catastrophes/',
```

### 2. Push to GitHub

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

### 3. Enable GitHub Pages

In your repo on GitHub:
- Go to Settings → Pages
- Under **Source**, select **GitHub Actions**
- Save

The workflow will trigger automatically on the next push.
Your site will be live at `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`

## Local development

```bash
cd catastrophes-app
npm install
npm run dev
```

## How the GitHub Action works

On every push to `main`:
1. Installs dependencies and builds the Vite app (`npm run build`)
2. Assembles a `_site/` folder:
   - `index.html` (landing page) at the root
   - built app files under `catastrophes/`
3. Deploys `_site/` to GitHub Pages

Changes to `index.html` (landing page) and changes to `catastrophes-app/src/`
both trigger a full redeploy automatically.

