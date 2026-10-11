# Vercel Environment Variables Setup

## Required Environment Variables

The following environment variables must be set in **Vercel Dashboard** → **Project Settings** → **Environment Variables**:

### Production and Preview Environments

| Variable | Value | Environments |
|----------|-------|--------------|
| `VITE_API_BASE_URL` | `https://jeevacare-th88.onrender.com/api/v1` | Production, Preview |
| `VITE_DEMO_MODE` | `false` | Production, Preview |
| `VITE_DEMO_MODE_UNLOCK_KEY` | _(empty string)_ | Production, Preview |
| `VITE_ENABLE_DEBUG_LOGS` | `false` | Production, Preview |
| `VITE_ENABLE_PERFORMANCE_MONITORING` | `true` | Production, Preview |

### Development Environment

For local development, these variables have fallback values in the source code:
- `VITE_API_BASE_URL` defaults to `http://localhost:5000/api/v1`

## Why not in vercel.json?

The `env` field in `vercel.json` is **deprecated** according to [official Vercel documentation](https://vercel.com/docs/project-configuration/vercel-json):

> "We recommend against using this property. To add custom environment variables to your project define them in the Project Settings."

## How to Set Environment Variables in Vercel Dashboard

1. Go to your project in Vercel Dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Click **Add** for each variable
4. Enter the **Key** and **Value**
5. Select the environments: **Production**, **Preview**, and/or **Development**
6. Click **Save**
7. Redeploy your project for changes to take effect

## Verification

After setting environment variables and redeploying:

1. Check the deployment logs to ensure the build used the correct values
2. Inspect the built JavaScript bundle to verify the API URL is correct
3. Test the frontend login to confirm requests go to: `https://jeevacare-th88.onrender.com/api/v1/auth/login`
