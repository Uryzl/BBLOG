# Personal Blog

A cozy, minimalist blog with a local admin dashboard for writing posts, and a
publish step that generates a plain static site you can host anywhere (set up
for GitHub Pages).

## Setup

```
npm install
```

## Writing posts (local admin dashboard)

```
npm run admin
```

Open http://localhost:3000. From there you can:

- Write posts with a rich text editor (bold/italic, links, embedded photos)
- Upload a thumbnail photo per post
- Pick a font for each post title (calligraphy scripts or clean basics)
- Create, rename, reorder, and delete categories — each becomes its own page
  and nav link on the site
- Save posts as drafts or publish them

This dashboard is for your eyes only — run it locally whenever you want to
write or edit something, and close it when you're done.

## Publishing the site

Click **Publish Site** on the dashboard (or run `npm run build`). This
regenerates the static site in `docs/` from whatever posts are marked
"Published". Draft posts are never included.

To preview the generated site locally before it's live:

```
npx serve docs
```

## Going live (GitHub Pages)

Once you're happy with the site:

1. Create a new GitHub repository and push this project to it.
2. In the repo's Settings → Pages, set **Source** to "Deploy from a branch",
   **Branch** to `main`, **Folder** to `/docs`.
3. Your site will be live at `https://<your-username>.github.io/<repo-name>/`
   within about a minute.
4. Any time you publish new content: run `npm run build` (or click Publish
   in the admin), then `git add -A && git commit -m "update" && git push`.
   GitHub Pages picks up the new `docs/` folder automatically.

If your site is served from a subpath like the URL above (rather than a
custom domain at the root), set `"basePath": "/<repo-name>"` in
`config/site.json` before publishing, so links and images resolve correctly.
# BBLOG
