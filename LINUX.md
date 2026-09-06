On Linux, here's the exact flow:

## 1. Install git (if not already)

```bash
sudo apt update && sudo apt install git -y
```

## 2. Set your identity (one-time)

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

## 3. Go to the project root

```bash
cd ~/remote-screen-qr        # adjust to wherever your files are
ls                            # confirm you see android-app, server, dashboard...
```

## 4. Initialize and link to GitHub (first time only)

Create the empty repo on github.com first (no README/license — keep it empty), then:

```bash
git init
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/remote-screen-qr.git
```

## 5. Run the commit + push command

```bash
git add . && git commit -m "Initial: android app, relay server, dashboard, QR generator, CI" && git push
```

First push may need:
```bash
git push -u origin main
```

## 6. Authentication (the part that trips people up)

A password prompt **will not work** — you need one of these:

**Option A — Personal Access Token (easiest):**
1. GitHub → Settings → Developer settings → **Personal access tokens** → **Tokens (classic)** → Generate new token
2. Check the `repo` scope, set an expiry
3. When `git push` asks for a password, **paste the token**
4. Cache it so you don't retype it:
   ```bash
   git config --global credential.helper store   # saves to ~/.git-credentials (plaintext)
   ```

**Option B — GitHub CLI (smoothest):**
```bash
sudo apt install gh -y
gh auth login        # follow prompts (browser-based)
```

**Option C — SSH:**
```bash
ssh-keygen -t ed25519 -C "you@example.com"
cat ~/.ssh/id_ed25519.pub     # copy, paste into GitHub → Settings → SSH keys
git remote set-url origin git@github.com:YOUR_USERNAME/remote-screen-qr.git
```

## Verify it worked

```bash
git log --oneline        # shows your commit
git status               # "nothing to commit, working tree clean"
```
Then refresh your repo page on GitHub — the files should be there.
