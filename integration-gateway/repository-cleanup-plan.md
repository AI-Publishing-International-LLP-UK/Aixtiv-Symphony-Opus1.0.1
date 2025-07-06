# Repository Cleanup & Standardization Plan
Generated: 2025-06-22

## Current Repository Analysis

### Summary
- **33 local Git repositories** found in `/Users/as/asoos`
- **15 backup/archive repositories** (can be cleaned up)
- **4 orphaned repositories** (no remote tracking)
- **Multiple duplicate remotes** pointing to same repositories

## Phase 1: Local Repository Cleanup

### 🗑️ Safe to Remove (Backup/Archive Directories)
```bash
# These are old backups and can be safely removed:
rm -rf /Users/as/asoos/build/backups/
rm -rf /Users/as/asoos/backups/20250524_222827_opus_backup/
rm -rf /Users/as/asoos/vls-original-backup/
```
**Impact**: Removes 15 backup repositories, reducing clutter

### 🔧 Orphaned Repositories (Need Remote Tracking)
1. `/Users/as/asoos/vls/solutions/dr-memoria-anthology/functions/integration-gateway`
2. `/Users/as/asoos/vls/solutions/voice-synthesis`
3. `/Users/as/asoos/opus/opus1.0.1/vls/solutions/dr-memoria-anthology-launch/functions/integration-gateway`
4. `/Users/as/asoos/opus/opus1.0.1/vls/solutions/dr-memoria-anthology-launch/functions/anthology-integration-gateway`

**Action Required**: Determine if these should be:
- Connected to existing remotes
- Created as new repositories
- Merged into parent repositories
- Removed entirely

## Phase 2: Active Repository Standardization

### 🎯 Core Active Repositories (Keep & Standardize)

#### Primary Development Repositories
1. **`/Users/as/asoos`** (Root project)
   - Current: `AI-Publishing-International-LLP-UK/Aixtiv-Symphony-Opus1.0.1`
   - Status: ✅ Properly configured

2. **`/Users/as/asoos/integration-gateway`** (Current location)
   - Current: `C2100-PR/website-build` (MISMATCH!)
   - Should be: `AI-Publishing-International-LLP-UK/integration-gateway`
   - **Action**: Fix remote URL

3. **`/Users/as/asoos/aixtiv-cli`**
   - Current: Dual remotes (Good practice)
   - Status: ✅ Properly configured

4. **`/Users/as/asoos/academy`**
   - Current: `C2100-PR/website-build` (MISMATCH!)
   - Should be: `AI-Publishing-International-LLP-UK/academy`
   - **Action**: Fix remote URL

5. **`/Users/as/asoos/opus/opus1.0.1`**
   - Current: `AI-Publishing-International-LLP-UK/ASOOS-MAIN`
   - Status: ✅ Properly configured

#### Supporting Repositories
6. **`/Users/as/asoos/vls`**
   - Current: `C2100-PR/website-build` (MISMATCH!)
   - Should be: `AI-Publishing-International-LLP-UK/vls`

7. **`/Users/as/asoos/wing`**
   - Current: `C2100-PR/website-build` (MISMATCH!)
   - Should be: `AI-Publishing-International-LLP-UK/wing`

## Phase 3: Remote Repository Audit

### 🔍 GitHub Repository Status Check
Based on your GitHub analysis:

#### AI-Publishing-International-LLP-UK (15 repos) - PRIMARY ORG
- ✅ `ASOOS-MAIN`
- ✅ `aixtiv-cli`
- ✅ `adk-samples`
- ✅ `deployment-ready`
- ✅ `Aixtiv-Symphony`
- ✅ `Roark-5.0-Framework`
- ✅ `aixtiv-push`
- ✅ `AIXTIV-SYMPHONY`
- ❓ Missing: `integration-gateway`, `academy`, `vls`, `wing`

#### C2100-PR (276 repos) - EXPERIMENTAL/LEGACY
- Many repos appear to be experimental or legacy
- Need audit to determine which are actively maintained
- Consider archiving unused repositories

## Phase 4: Standardization Actions

### 🔧 Immediate Fixes Required

```bash
# Fix integration-gateway remote
cd /Users/as/asoos/integration-gateway
git remote remove C2100-PR
git remote remove drlucy
git remote add origin https://github.com/AI-Publishing-International-LLP-UK/integration-gateway.git

# Fix academy remote
cd /Users/as/asoos/academy
git remote remove C2100-PR
git remote remove drlucy
git remote add origin https://github.com/AI-Publishing-International-LLP-UK/academy.git

# Fix vls remote
cd /Users/as/asoos/vls
git remote remove C2100-PR
git remote remove drlucy
git remote add origin https://github.com/AI-Publishing-International-LLP-UK/vls.git

# Fix wing remote
cd /Users/as/asoos/wing
git remote remove C2100-PR
git remote remove drlucy
git remote add origin https://github.com/AI-Publishing-International-LLP-UK/wing.git
```

### 📋 Remote Repository Creation Needed
Create these repositories in AI-Publishing-International-LLP-UK:
1. `integration-gateway`
2. `academy`
3. `vls`
4. `wing`
5. Individual repos for orphaned directories (if needed)

## Phase 5: Organization Strategy

### 🏗️ Recommended Repository Structure

#### AI-Publishing-International-LLP-UK (Production/Main)
- Core ASOOS components
- Production-ready code
- Stable releases
- Team collaboration

#### C2100-PR (Development/Experimental)
- Experimental features
- Individual developer work
- Prototypes and POCs
- Archive old/unused repos

### 🎯 Target State (8 Core Repositories)
1. `ASOOS-MAIN` (Root orchestration)
2. `integration-gateway` (Domain & security)
3. `academy` (Learning platform)
4. `aixtiv-cli` (Command interface)
5. `vls` (Vision Lake Solutions)
6. `wing` (Agent orchestration)
7. `adk-samples` (Development samples)
8. `deployment-ready` (Production deployment)

## Implementation Timeline

### Week 1: Cleanup
- [ ] Remove backup directories
- [ ] Audit orphaned repositories
- [ ] Create missing GitHub repositories

### Week 2: Standardization
- [ ] Fix remote URLs
- [ ] Establish consistent naming
- [ ] Update documentation

### Week 3: Organization
- [ ] Archive unused C2100-PR repositories
- [ ] Establish repository governance
- [ ] Update CI/CD pipelines

## Risk Mitigation
- ✅ All cleanup commands preserve data (only remove backups)
- ✅ Standardization maintains existing remote content
- ✅ Gradual implementation allows testing at each step
- ✅ Clear rollback procedures documented

## Success Metrics
- Reduce local repositories from 33 to ~12 active
- Standardize remote tracking to primary organization
- Eliminate orphaned repositories
- Archive 90%+ of unused GitHub repositories
