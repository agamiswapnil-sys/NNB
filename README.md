# NNB Academy

A responsive React + Vite sports academy site with dynamic player profiles and a small Express API. Player biographies, highlights and event records live in `server/data/players.json`. The public API returns event titles only; full event details are returned only after the backend verifies the contact form and CAPTCHA.

## Run locally

1. Install Node.js 20.19+ (or 22.12+) and npm.
2. From the project folder run:

   ```sh
   npm install
   npm run dev
   ```

3. Open the Vite URL shown in the terminal (normally `http://localhost:5173`).

Local development uses a short-lived, one-use arithmetic challenge verified by the API, so no CAPTCHA credentials are needed. To run the production build locally, use `npm run build`, then set the environment variables below and run `npm start`.

## Admin panel

Open `http://localhost:5173/admin` while the development server is running. Set the admin login in a local `.env` file (copy `.env.example` and choose a unique, long password):

```text
ADMIN_USERNAME=admin
ADMIN_PASSWORD=choose-a-unique-password-of-at-least-16-characters
```

Restart `npm run dev` after changing `.env`. The admin panel can add, edit and remove athlete profiles, highlights, events and event photos. Changes are saved to `server/data/players.json` and appear on the website immediately. Admin sessions use HttpOnly, SameSite cookies, CSRF tokens, and login rate limits. Keep `.env` private; never publish it or commit it to source control.

## Production CAPTCHA

Production mode requires Cloudflare Turnstile. Create a Turnstile widget, then configure:

```text
NODE_ENV=production
TURNSTILE_SITE_KEY=your_public_site_key
TURNSTILE_SECRET_KEY=your_private_secret_key
PORT=5174
```

The site key is safe to expose to the browser. Keep the secret key server-side only. The server validates Turnstile tokens with Cloudflare before returning event details and applies request rate limits. Event data is kept on the server and is not included in public profile responses.

## Event enquiries, members and email

After a visitor passes CAPTCHA, their name, email, mobile number, selected athlete/event and consent choice are saved in the Admin Panel under **Members & enquiries**. Admins can delete submissions there. Contact data is stored locally in the ignored `server/data/submissions.json` file and is never included in the public members API.

To email each verified submission to `hello@gmail.com`, configure SMTP in the private `.env` file and restart the server. For Gmail, create a Google App Password for `hello@gmail.com` and set:

```text
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=hello@gmail.com
SMTP_PASSWORD=your-google-app-password
SMTP_FROM="NNB Academy <hello@gmail.com>"
```

Do not paste the App Password into chat or commit it. Until SMTP is configured, submissions are still saved in the Admin Panel and the visitor is told that email delivery is unavailable. Visitors can separately opt in to show their **name only** in the public Members section; email and mobile numbers remain private.

## Project layout

```text
server/
  data/players.json    Player profiles and private event details
  index.js             Express API and server-side CAPTCHA verification
src/
  components/          Shared navigation, cards and profile sections
  pages/               Home, profile, about, members, programs and contact
  styles/              Global, home and profile styles
  api.js               Frontend API client
  App.jsx              Routes and shared page state
```

## Available commands

- `npm run dev` — starts the API and Vite development server.
- `npm run build` — creates the production site in `dist/`.
- `npm start` — serves the production build and API (requires production Turnstile keys).
- `npm test` — runs Node's built-in test runner.
