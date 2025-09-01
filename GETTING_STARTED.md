# 🚀 Getting Started Guide

This guide will walk you through deploying the Nonprofit AI Ethics Trolley Game from start to finish, assuming no prior experience with Supabase, GitHub, or Netlify.

## 📋 Prerequisites

Before we start, make sure you have accounts for:
- ✅ **Supabase** (database): https://supabase.com
- ✅ **GitHub** (code hosting): https://github.com  
- ✅ **Netlify** (website hosting): https://netlify.com

All of these are free to use for this project.

---

## Step 1: Set Up Your Database (Supabase)

### 1.1 Create a Supabase Project
1. Go to https://supabase.com and click **"Start your project"**
2. Sign in with GitHub (recommended) or create an account
3. Click **"New project"**
4. Choose your organization (usually your username)
5. Fill out the project details:
   - **Name**: `nonprofit-trolley-game`
   - **Database Password**: Create a strong password and save it somewhere safe
   - **Region**: Choose the region closest to your users
6. Click **"Create new project"**
7. ⏳ Wait 2-3 minutes for your database to be created

### 1.2 Get Your Database Credentials
1. In your new Supabase project, click **"Settings"** in the left sidebar
2. Click **"API"** in the settings menu
3. You'll see a **"Project URL"** and **"Project API keys"** section
4. **Copy and save these two values:**
   - **Project URL** (looks like: `https://abcdefghijk.supabase.co`)
   - **anon public key** (long text starting with `eyJ...`)
   
   💡 **Tip**: Keep these in a text file - you'll need them multiple times!

### 1.3 Set Up Your Database Tables
1. In your Supabase project, click **"SQL Editor"** in the left sidebar
2. Click **"+ New query"**
3. **Copy the entire contents** of the file `supabase-schema.sql` from this repository
4. **Paste it** into the SQL editor (replace any existing text)
5. Click the **"Run"** button (▶️) in the top-right
6. ✅ You should see "Success. No rows returned" - this means it worked!

**What this does:** Creates all the database tables and loads the 10 nonprofit scenarios into your database.

---

## Step 2: Update Your Environment Variables

### 2.1 Find Your Environment File
1. In this project, go to the `client` folder
2. Find the file called `.env.local`
3. Open it in any text editor

### 2.2 Replace the Placeholder Values
Replace these lines:
```
REACT_APP_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
REACT_APP_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

With your actual values from Step 1.2:
```
REACT_APP_SUPABASE_URL=https://abcdefghijk.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2.3 Save the File
Make sure to save the `.env.local` file after making changes.

---

## Step 3: Test Locally (Optional but Recommended)

Before deploying to the internet, let's test that everything works on your computer.

### 3.1 Install Node.js
If you don't have Node.js installed:
1. Go to https://nodejs.org
2. Download and install the "LTS" version (recommended for most users)

### 3.2 Run the Application
1. Open Terminal (Mac) or Command Prompt (Windows)
2. Navigate to your project folder:
   ```bash
   cd path/to/nonprofit-trolley-game/client
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm start
   ```
5. Your browser should open to `http://localhost:3000`
6. ✅ **Test**: Try creating a room and joining it in a different browser tab

If everything works locally, you're ready to deploy!

---

## Step 4: Deploy to the Internet (Netlify)

### 4.1 Connect GitHub to Netlify
1. Go to https://app.netlify.com
2. Click **"Add new site"**
3. Click **"Import an existing project"**
4. Click **"Deploy with GitHub"**
5. **If prompted**: Click "Authorize Netlify" to connect your GitHub account
6. **Find your repository**: Look for `nonprofit-trolley-game` in the list
7. Click on your repository name

### 4.2 Configure Build Settings
Netlify will show you a "Deploy settings" page. Enter these values:

**Owner**: (This should be filled automatically)
**Branch to deploy**: `main`
**Base directory**: `client`
**Build command**: `npm run build`  
**Publish directory**: `client/build`

### 4.3 Add Your Database Credentials
⚠️ **Important**: Don't deploy yet! First, add your environment variables:

1. Click **"Show advanced"**
2. Click **"New variable"** and add each of these:

| Variable name | Value |
|---------------|--------|
| `REACT_APP_SUPABASE_URL` | Your Project URL from Step 1.2 |
| `REACT_APP_SUPABASE_ANON_KEY` | Your anon public key from Step 1.2 |
| `REACT_APP_ENVIRONMENT` | `production` |

3. After adding all three variables, click **"Deploy site"**

### 4.4 Wait for Deployment
1. ⏳ Watch the deploy log - it should take 2-3 minutes
2. ✅ When it shows "Site is live", click on the URL (something like `https://amazing-name-123456.netlify.app`)
3. 🎉 Your app is now live on the internet!

---

## Step 5: Test Your Live Site

### 5.1 Test as a Facilitator
1. Visit your Netlify URL
2. Click **"Create Session"** 
3. Configure your room settings
4. Click **"Create Room"**
5. ✅ You should see a room code and QR code

### 5.2 Test as a Participant
1. Open a different browser (or incognito/private window)
2. Go to your Netlify URL
3. Click **"Join Session"**
4. Enter the room code from step 5.1
5. ✅ You should be able to participate in voting

### 5.3 Test Full Workflow
1. As facilitator: Start a scenario
2. As participant: Vote and add a rationale
3. Check that results appear in real-time
4. ✅ Word clouds should generate from rationales

---

## 🎉 You're Done!

Your Nonprofit AI Ethics Trolley Game is now live on the internet! Here's what you can do next:

### Share Your Game
- **URL**: Your Netlify site URL (bookmark this!)
- **Room Codes**: Generated fresh for each session
- **QR Codes**: Perfect for in-person workshops

### Customize Your Site (Optional)
1. **Custom Domain**: In Netlify, go to "Domain settings" to add your own domain
2. **Site Name**: Change from random name to something memorable
3. **Analytics**: Enable Netlify Analytics to see usage stats

### Need Help?

**Common Issues:**
- **"Failed to fetch"**: Check your environment variables in Netlify
- **Blank page**: Check the deploy log for build errors
- **No scenarios loading**: Make sure the SQL schema ran successfully in Supabase

**Get Support:**
- 🐛 [Report bugs](https://github.com/joshuamtm/nonprofit-trolley-game/issues)
- 💬 [Ask questions](https://github.com/joshuamtm/nonprofit-trolley-game/discussions)
- 📧 Email: support@joshuamtm.com

---

## 📊 Understanding Your Usage

### Supabase Dashboard
- View real-time database activity
- See participant counts and voting patterns
- Monitor performance and errors

### Netlify Dashboard  
- Track deployment history
- View bandwidth usage
- Monitor site performance

### Game Analytics
The app automatically tracks (anonymously):
- Number of sessions created
- Participant engagement rates
- Popular scenarios
- Response time patterns

---

**🎯 Pro Tip**: Run a test session with colleagues before your first real workshop to familiarize yourself with the facilitator controls!