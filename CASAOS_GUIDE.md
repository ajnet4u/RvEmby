# Running R_volution Player with Emby and CasaOS

Yes! This player is built to work seamlessly with **Emby Server** (and its fork **Jellyfin**), and you can definitely run this in your **CasaOS** environment.

---

## 1. Does this work with Emby?

**YES! 100%.**
The app directly interfaces with the official **Emby REST API**:
- Fetches all movies (`/Items?IncludeItemTypes=Movie`)
- Loads high-resolution Posters and 4K Backdrops (`/Items/{id}/Images/...`)
- Extracts full metadata:
  - **Community Ratings** (e.g., 8.2 ★)
  - **Content Ratings** (e.g., PG-13, 16+, R)
  - **Director & Cast lists**
  - **Media Stream Badges** (4K UHD / 1080p, HDR10+, Dolby Vision)
  - **Audio Formats** (DTS:X, Dolby 5.1, TrueHD, Atmos)
- Plays direct streams directly from Emby (`/Videos/{id}/stream.mp4?Static=true`)

### How to connect Emby to R_volution Player:
1. Open your Emby Server dashboard in your browser (e.g. `http://192.168.10.146:8096`).
2. Go to **Settings (Gear icon) > Advanced > API Keys**.
3. Click **New API Key**, type "R_volution", and copy the generated key.
4. In the R_volution Player, open Settings, enter:
   - **Server URL**: `http://192.168.10.146:8096`
   - **API Key**: `<Your Emby API Key>`
5. Click **Test Connection** to verify, then click **Save & Connect**!

---

## 2. Can I run this on CasaOS?

**YES! There are two ways you can use this with CasaOS:**

### Method A: Host the R_volution UI directly on CasaOS (Docker)
In this setup, CasaOS hosts the R_volution player as a web app. Any device on your home network (Smart TV browser, Windows PC, laptop, tablet, phone) can open `http://<CASAOS-IP>:3000` to enjoy the full R_volution experience.

#### Steps to install in CasaOS:
1. Push this project to GitHub (or copy the files to your CasaOS machine).
2. On CasaOS dashboard:
   - Click the **+** (Install a customized app) at the top right.
   - Click **Import** at the top right of the modal window.
   - Paste the contents of `docker-compose.yml` (located in the root of this project).
   - Click **Submit**.
   - Click **Install**.
3. CasaOS will build the container and add an **R_volution Player** icon to your CasaOS home dashboard!
4. Click the app icon to open it at port `3000`. You can press `F11` on your browser to put it into clean fullscreen TV mode.

---

### Method B: CasaOS runs Emby, and your Windows PC runs the Fullscreen Desktop App (.exe)
CasaOS is usually a headless home server / NAS. The most common home theater setup is:
- **CasaOS Machine** runs your Emby Server (at `http://192.168.10.146:8096`).
- **Windows PC / HTPC connected to your TV** runs the standalone R_volution desktop `.exe` in native fullscreen mode.

#### To build the Windows `.exe` desktop app:
1. Clone your GitHub repository to your Windows PC:
   ```bash
   git clone <YOUR-GITHUB-REPO-URL>
   cd <REPO-NAME>
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Test locally in Electron fullscreen:
   ```bash
   npm run app:dev
   ```
4. Package the standalone Windows installer / executable:
   ```bash
   npm run app:build
   ```
   The `.exe` will be generated in the `release/` folder!
