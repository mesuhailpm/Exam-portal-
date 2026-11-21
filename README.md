# Exam Result Portal (React + Vite + Tailwind)

A clean, responsive examination result portal built with React and Vite, ready for instant deployment on Vercel.

## Features
- **Student Portal:** Students look up their marksheet using their **Admission Number** and **Date of Birth**.
- **Printable Marksheet:** Clean print stylesheet so students can print or save their result as a PDF.
- **Admin Dashboard:** Passcode-protected admin area (`admin123` by default) to upload CSV result sheets, customize institution/exam titles, and adjust pass percentage thresholds.
- **Dynamic CSV Parser:** Automatically detects any subject columns in your uploaded CSV file.

## Deploying to Vercel
1. Extract this `.zip` file.
2. Push the folder to a GitHub/GitLab/Bitbucket repository **or** deploy directly via the Vercel CLI (`npx vercel`).
3. Vercel automatically detects **Vite**, runs `npm run build`, and serves `dist/`.

## Important Note on Data Persistence
Because this starter package runs purely on the frontend without an external database, CSV uploads made in the Admin panel are stored in the browser's `localStorage`.
- To make uploaded results visible to **all students globally**, either:
  1. Replace `src/defaultData.js` with your real student records before deploying, **or**
  2. Connect a free cloud database like **Supabase** or **Firebase Firestore** so Admin CSV uploads persist centrally for every student device.
