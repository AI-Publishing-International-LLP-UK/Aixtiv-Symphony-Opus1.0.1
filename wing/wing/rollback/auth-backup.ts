import { BackupComponent } from './backup-manager';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface AuthSession {
  id: string;
  userId: string;
  username: string;
  roles: string[];
  permissions: string[];
  createdAt: number;
  expiresAt: number;
  lastActivityAt: number;
  ipAddress: string;
  userAgent: string;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  isEmergencyAccess?: boolean;
}

export class AuthBackup implements BackupComponent {
  private readonly backupDir: string;
  private sessions: Map<string, AuthSession> = new Map();
  private emergencySessions: Map<string, AuthSession> = new Map();
  private readonly sessionSecret: string;
  private sessionBackupPath: string;

  constructor(backupDir: string, sessionSecret?: string) {
    this.backupDir = path.join(backupDir, 'auth');
    this.sessionSecret = sessionSecret || process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
    this.sessionBackupPath = path.join(this.backupDir, 'sessions.json');
    
    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
    
    // Load existing sessions if available
    this.loadSessions();
  }

  /**
   * Create a backup of the current authentication state
   */
  async createBackup(backupId: string): Promise<string> {
    try {
      const backupPath = path.join(this.backupDir, `auth-backup-${backupId}.json`);
      const sessionData = Array.from(this.sessions.values());
      const emergencyData = Array.from(this.emergencySessions.values());
      
      const backupData = {
        timestamp: Date.now(),
        backupId,
        sessions: sessionData,
        emergencySessions: emergencyData,
        metadata: {
          activeSessionCount: sessionData.length,
          emergencySessionCount: emergencyData.length
        }
      };
      
      fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
      console.log(`Authentication backup created: ${backupPath}`);
      return backupPath;
    } catch (error) {
      console.error('Failed to create authentication backup:', error);
      throw new Error(`Authentication backup failed: ${error.message}`);
    }
  }

  /**
   * Restore authentication state from a backup
   */
  async restoreFromBackup(backupId: string): Promise<boolean> {
    try {
      const backupPath = path.join(this.backupDir, `auth-backup-${backupId}.json`);
      
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Authentication backup not found: ${backupPath}`);
      }
      
      const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
      
      // Clear current sessions and restore from backup
      this.sessions.clear();
      this.emergencySessions.clear();
      
      // Filter out expired sessions during restore
      const currentTime = Date.now();
      const validSessions = backupData.sessions.filter((session: AuthSession) => 
        this.isValidSession(session, currentTime)
      );
      
      // Always restore emergency sessions regardless of expiry
      const emergencySessions = backupData.emergencySessions;
      
      // Restore valid sessions
      validSessions.forEach((session: AuthSession) => {
        this.sessions.set(session.id, session);
      });
      
      // Restore emergency sessions
      emergencySessions.forEach((session: AuthSession) => {
        this.emergencySessions.set(session.id, session);
      });
      
      // Save the restored sessions
      this.saveSessions();
      
      console.log(`Authentication state restored from backup: ${backupPath}`);
      console.log(`Restored ${validSessions.length} valid sessions, ${emergencySessions.length} emergency sessions`);
      
      return true;
    } catch (error) {
      console.error('Failed to restore authentication from backup:', error);
      throw new Error(`Authentication restore failed: ${error.message}`);
    }
  }

  /**
   * Validate if a session is still valid
   */
  isValidSession(session: AuthSession, currentTime: number = Date.now()): boolean {
    // Check if session has expired
    if (session.expiresAt < currentTime) {
      return false;
    }
    
    // Check if session has been inactive for too long (30 minutes)
    const inactivityThreshold = 30 * 60 * 1000; // 30 minutes in milliseconds
    if (currentTime - session.lastActivityAt > inactivityThreshold) {
      return false;
    }
    
    // For emergency sessions, ensure they're specially marked
    if (session.isEmergencyAccess) {
      // Emergency sessions have stronger validation requirements
      // Check if the emergency session is within its limited time window (typically 4 hours)
      const emergencySessionLifetime = 4 * 60 * 60 * 1000; // 4 hours
      if (currentTime - session.createdAt > emergencySessionLifetime) {
        return false;
      }
    }
    
    // Verify token integrity
    try {
      const tokenData = this.verifyToken(session.tokens.accessToken);
      if (!tokenData || tokenData.userId !== session.userId) {
        return false;
      }
    } catch (error) {
      return false;
    }
    
    return true;
  }

  /**
   * Create an emergency session for rollback operations
   */
  createEmergencySession(userId: string, username: string, roles: string[]): AuthSession {
    const sessionId = uuidv4();
    const emergencyRoles = [...roles, 'EMERGENCY_ADMIN', 'ROLLBACK_OPERATOR'];
    const emergencyPermissions = [
      'system:rollback',
      'system:backup',
      'system:restore',
      'system:emergency',
      'agents:manage',
      'visionlake:admin'
    ];
    
    const currentTime = Date.now();
    const sessionDuration = 4 * 60 * 60 * 1000; // 4 hours
    
    const accessToken = this.generateToken({
      userId,
      sessionId,
      type: 'access',
      isEmergency: true
    });
    
    const refreshToken = this.generateToken({
      userId,
      sessionId,
      type: 'refresh',
      isEmergency: true
    });
    
    const session: AuthSession = {
      id: sessionId,
      userId,
      username,
      roles: emergencyRoles,
      permissions: emergencyPermissions,
      createdAt: currentTime,
      expiresAt: currentTime + sessionDuration,
      lastActivityAt: currentTime,
      ipAddress: 'emergency-access',
      userAgent: 'WING-Emergency-System',
      tokens: {
        accessToken,
        refreshToken
      },
      isEmergencyAccess: true
    };
    
    // Store the emergency session
    this.emergencySessions.set(sessionId, session);
    this.saveSessions();
    
    return session;
  }

  /**
   * Verify an authentication token
   */
  private verifyToken(token: string): any {
    try {
      const [encodedHeader, encodedPayload, signature] = token.split('.');
      
      // Recreate the signature
      const data = `${encodedHeader}.${encodedPayload}`;
      const expectedSignature = crypto
        .createHmac('sha256', this.sessionSecret)
        .update(data)
        .digest('base64url');
      
      // Verify signature
      if (signature !== expectedSignature) {
        return null;
      }
      
      // Decode payload
      const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
      
      // Check if token is expired
      if (payload.exp && payload.exp < Date.now()) {
        return null;
      }
      
      return payload;
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }

  /**
   * Generate an authentication token
   */
  private generateToken(payload: any): string {
    // Create token header
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };
    
    // Add expiration to payload
    const tokenDuration = payload.type === 'access' ? 1 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 1 hour for access, 24 hours for refresh
    const fullPayload = {
      ...payload,
      iat: Date.now(),
      exp: Date.now() + tokenDuration
    };
    
    // Encode header and payload
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
    
    // Create signature
    const data = `${encodedHeader}.${encodedPayload}`;
    const signature = crypto
      .createHmac('sha256', this.sessionSecret)
      .update(data)
      .digest('base64url');
    
    // Combine to form token
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  /**
   * Save sessions to disk
   */
  private saveSessions(): void {
    try {
      const sessionData = {
        updated: Date.now(),
        sessions: Array.from(this.sessions.values()),
        emergencySessions: Array.from(this.emergencySessions.values())
      };
      
      fs.writeFileSync(this.sessionBackupPath, JSON.stringify(sessionData, null, 2));
    } catch (error) {
      console.error('Failed to save sessions:', error);
    }
  }

  /**
   * Load sessions from disk
   */
  private loadSessions(): void {
    try {
      if (fs.existsSync(this.sessionBackupPath)) {
        const sessionData = JSON.parse(fs.readFileSync(this.sessionBackupPath, 'utf8'));
        
        // Load regular sessions
        sessionData.sessions.forEach((session: AuthSession) => {
          if (this.isValidSession(session)) {
            this.sessions.set(session.id, session);
          }
        });
        
        // Load emergency sessions
        sessionData.emergencySessions.forEach((session: AuthSession) => {
          this.emergencySessions.set(session.id, session);
        });
        
        console.log(`Loaded ${this.sessions.size} valid sessions, ${this.emergencySessions.size} emergency sessions`);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  }

  /**
   * Purge expired sessions
   */
  purgeExpiredSessions(): number {
    const currentTime = Date.now();
    let purgedCount = 0;
    
    // Purge expired regular sessions
    for (const [sessionId, session] of this.sessions.entries()) {
      if (!this.isValidSession(session, currentTime)) {
        this.sessions.delete(sessionId);
        purgedCount++;
      }
    }
    
    // Purge expired emergency sessions
    for (const [sessionId, session] of this.emergencySessions.entries()) {
      if (!this.isValidSession(session, currentTime)) {
        this.emergencySessions.delete(sessionId);
        purgedCount++;
      }
    }
    
    // Save changes if any sessions were purged
    if (purgedCount > 0) {
      this.saveSessions();
    }
    
    return purgedCount;
  }
}

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import zlib from 'zlib';
import crypto from 'crypto';
import { BackupComponent } from './backup-manager';

/**
 * Interface for authentication session data
 */
interface AuthSession {
  /** Unique session identifier */
  id: string;
  /** User identifier */
  userId: string;
  /** Token for session authentication */
  token: string;
  /** When the session was created */
  createdAt: number;
  /** When the session expires */
  expiresAt: number;
  /** Session permissions */
  permissions: string[];
  /** Additional user metadata */
  metadata: Record<string, any>;
  /** IP address of the session */
  ipAddress?: string;
  /** User agent of the session */
  userAgent?: string;
  /** Last activity timestamp */
  lastActivity: number;
}

/**
 * Interface for auth backup data
 */
interface AuthBackupData {
  /** Active sessions at backup time */
  sessions: AuthSession[];
  /** Token blacklist for revoked tokens */
  tokenBlacklist: string[];
  /** System version at backup time */
  systemVersion: string;
  /** Backup timestamp */
  timestamp: number;
}

/**
 * AuthBackup implements BackupComponent for authentication sessions management
 * Handles backup and restore of user sessions and authentication state
 */
export class AuthBackup implements BackupComponent {
  /** Component name */
  public readonly name = 'auth-sessions';
  
  /** Backup priority (higher runs later) */
  public readonly priority = 20;
  
  private authServiceUrl: string;
  private apiKey: string;
  private sessionStore: Map<string, AuthSession> = new Map();
  private tokenBlacklist: Set<string> = new Set();
  private backupDir: string;
  
  /**
   * Create an AuthBackup instance
   * @param options Configuration for authentication backup
   */
  constructor(options: {
    authServiceUrl: string;
    apiKey: string;
    backupDir: string;
  }) {
    this.authServiceUrl = options.authServiceUrl;
    this.apiKey = options.apiKey;
    this.backupDir = options.backupDir;
    
    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }
  
  /**
   * Initialize the authentication backup system
   * Loads existing sessions from the authentication service
   */
  public async initialize(): Promise<void> {
    try {
      // Load active sessions from auth service
      await this.fetchActiveSessions();
      console.log(`Initialized auth backup with ${this.sessionStore.size} active sessions`);
    } catch (error) {
      console.error(`Error initializing auth backup: ${error.message}`);
      throw new Error(`Auth backup initialization failed: ${error.message}`);
    }
  }
  
  /**
   * Fetch active sessions from the authentication service
   */
  private async fetchActiveSessions(): Promise<void> {
    try {
      // In a real implementation, this would call your auth service API
      // For demonstration purposes, we're mocking this
      const response = await fetch(`${this.authServiceUrl}/api/sessions`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch sessions: HTTP ${response.status}`);
      }
      
      const sessions = await response.json() as AuthSession[];
      
      // Clear existing sessions
      this.sessionStore.clear();
      
      // Store sessions in memory
      for (const session of sessions) {
        this.sessionStore.set(session.id, session);
      }
      
      console.log(`Loaded ${sessions.length} active sessions`);
    } catch (error) {
      console.error(`Error fetching active sessions: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Create a backup of authentication sessions
   * Implements BackupComponent.backup()
   */
  public async backup(): Promise<{ data: any; sizeBytes: number }> {
    try {
      // Refresh session data before backup
      await this.fetchActiveSessions();
      
      // Prepare backup data
      const backupData: AuthBackupData = {
        sessions: Array.from(this.sessionStore.values()),
        tokenBlacklist: Array.from(this.tokenBlacklist),
        systemVersion: process.env.SYSTEM_VERSION || '1.0.0',
        timestamp: Date.now()
      };
      
      // Calculate size
      const jsonData = JSON.stringify(backupData);
      const sizeBytes = Buffer.byteLength(jsonData, 'utf8');
      
      console.log(`Created auth sessions backup with ${backupData.sessions.length} sessions, size: ${sizeBytes} bytes`);
      
      return {
        data: backupData,
        sizeBytes
      };
    } catch (error) {
      console.error(`Error creating auth sessions backup: ${error.message}`);
      throw new Error(`Failed to create auth backup: ${error.message}`);
    }
  }
  
  /**
   * Restore authentication sessions from backup
   * Implements BackupComponent.restore()
   */
  public async restore(data: AuthBackupData): Promise<boolean> {
    try {
      if (!data || !data.sessions) {
        throw new Error('Invalid authentication backup data');
      }
      
      console.log(`Restoring ${data.sessions.length} authentication sessions`);
      
      // Filter out expired sessions
      const now = Date.now();
      const validSessions = data.sessions.filter(session => session.expiresAt > now);
      
      // Update token blacklist
      this.tokenBlacklist = new Set(data.tokenBlacklist || []);
      
      // In a real implementation, this would call your auth service API
      // For demonstration purposes, we're just updating our local store
      this.sessionStore.clear();
      for (const session of validSessions) {
        this.sessionStore.set(session.id, session);
      }
      
      // Synchronize with auth service
      await this.syncSessionsToAuthService(validSessions);
      
      console.log(`Restored ${validSessions.length} valid authentication sessions`);
      return true;
    } catch (error) {
      console.error(`Error restoring authentication sessions: ${error.message}`);
      throw new Error(`Failed to restore authentication sessions: ${error.message}`);
    }
  }
  
  /**
   * Synchronize sessions to the authentication service
   */
  private async syncSessionsToAuthService(sessions: AuthSession[]): Promise<void> {
    try {
      // In a real implementation, this would call your auth service API
      // For demonstration purposes, we're mocking this
      const response = await fetch(`${this.authServiceUrl}/api/sessions/restore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessions, tokenBlacklist: Array.from(this.tokenBlacklist) })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to sync sessions: HTTP ${response.status}`);
      }
      
      console.log('Sessions synchronized with auth service');
    } catch (error) {
      console.error(`Error synchronizing sessions with auth service: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Verify authentication backup data
   * Implements BackupComponent.verify()
   */
  public async verify(data: AuthBackupData): Promise<boolean> {
    try {
      // Check if data has required structure
      if (!data || !Array.isArray(data.sessions) || !Array.isArray(data.tokenBlacklist)) {
        console.error('Invalid auth backup data structure');
        return false;
      }
      
      // Validate individual sessions
      for (const session of data.sessions) {
        if (!this.isValidSession(session)) {
          console.error(`Invalid session found: ${session.

