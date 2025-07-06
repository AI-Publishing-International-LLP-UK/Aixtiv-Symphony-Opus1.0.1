# How to Find Your Cloudflare Zone ID

## Step-by-Step Instructions:

1. **Go to Cloudflare Dashboard**: https://dash.cloudflare.com
2. **Click on your domain**: `2100.cool` 
3. **Look for the right sidebar** (you may need to scroll down slightly)
4. **Find the "API" section** in the right sidebar
5. **Copy the "Zone ID"** - it will look like: `1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p`

## What you're looking for:

```
API
Zone ID: 1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p  [Copy button]
Account ID: 9z8y7x6w5v4u3t2s1r0q9p8o7n6m5l4k  [Copy button]
```

## NOT the domain name:
❌ `2100.cool` (this is what's currently stored)
✅ `1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p` (this is what we need)

## Once you have it:
Run this command to update the secret:
```bash
echo "YOUR_ACTUAL_ZONE_ID_HERE" | gcloud secrets versions add cloudflare-zone-id --data-file=-
```

## Then run the production deployment:
```bash
./deploy-production-final.sh
```
