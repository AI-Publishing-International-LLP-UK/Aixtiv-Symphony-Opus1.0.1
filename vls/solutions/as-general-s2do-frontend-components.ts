/**
 * AIXTIV SYMPHONY™ S2DO Frontend Components
 * © 2025 AI Publishing International LLP
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * This is proprietary software of AI Publishing International LLP.
 * All rights reserved. No part of this software may be reproduced,
 * modified, or distributed without prior written permission.
 */

import React, { useState, useEffect, useCallback, useMemo, createContext, useContext } from 'react';
import { useAuth } from '../auth/AuthContext';
import { 
  S2DOManager, 
  S2DOObjectType,
  S2DOEncryptionLevel,
  S2DOAccessLevel
} from '../../core/s2do';
import { BlockchainIntegrationManager, S2DOBlockchainSecurityManager } from '../../core/blockchain-integration';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  Grid,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemSecondaryAction,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Snackbar,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  FilterList as FilterListIcon,
  FolderShared as FolderSharedIcon,
  History as HistoryIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Share as ShareIcon,
  Verified as VerifiedIcon,
  VerifiedUser as VerifiedUserIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import { Timestamp } from 'firebase/firestore';

// Initialize S2DO Manager with blockchain integrations
const blockchainManager = new BlockchainIntegrationManager(
  process.env.REACT_APP_ETHEREUM_RPC_URL || '',
  process.env.REACT_APP_PRIVATE_KEY || '',
  process.env.REACT_APP_NFT_CONTRACT_ADDRESS || '',
  process.env.REACT_APP_VERIFICATION_CONTRACT_ADDRESS || '',
  process.env.REACT_APP_SUBSCRIPTION_CONTRACT_ADDRESS || ''
);

const securityManager = new S2DOBlockchainSecurityManager(blockchainManager);
const s2doManager = new S2DOManager(blockchainManager, securityManager);

// S2DO Context for state management
interface S2DOContextType {
  objects: any[];
  selectedObject: any | null;
  loading: boolean;
  error: string | null;
  filters: {
    objectType: S2DOObjectType | '';
    searchTerm: string;
    status: 'active' | 'archived' | 'deleted';
  };
  refreshObjects: () => Promise<void>;
  createObject: (data: any) => Promise<any>;
  updateObject: (objectId: string, data: any) => Promise<any>;
  deleteObject: (objectId: string) => Promise<boolean>;
  archiveObject: (objectId: string) => Promise<boolean>;
  selectObject: (object: any | null) => void;
  setFilters: (filters: Partial<S2DOContextType['filters']>) => void;
  shareObject: (objectId: string, userIds: string[], orgIds: string[]) => Promise<any>;
  verifyObject: (objectId: string) => Promise<any>;
}

const S2DOContext = createContext<S2DOContextType>({
  objects: [],
  selectedObject: null,
  loading: false,
  error: null,
  filters: {
    objectType: '',
    searchTerm: '',
    status: 'active'
  },
  refreshObjects: async () => {},
  createObject: async () => ({}),
  updateObject: async () => ({}),
  deleteObject: async () => false,
  archiveObject: async () => false,
  selectObject: () => {},
  setFilters: () => {},
  shareObject: async () => ({}),
  verifyObject: async () => ({})
});

// S2DO Provider Component
export const S2DOProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [objects, setObjects] = useState<any[]>([]);
  const [selectedObject, setSelectedObject] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<S2DOContextType['filters']>({
    objectType: '',
    searchTerm: '',
    status: 'active'
  });

  // Load objects when user changes or filters change
  useEffect(() => {
    if (user) {
      refreshObjects();
    } else {
      setObjects([]);
      setSelectedObject(null);
    }
  }, [user, filters]);

  // Refresh objects
  const refreshObjects = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      let fetchedObjects;
      
      // If search term is provided, use search
      if (filters.searchTerm) {
        fetchedObjects = await s2doManager.searchObjects(
          user.id,
          {
            title: filters.searchTerm,
            objectType: filters.objectType as S2DOObjectType || undefined
          },
          filters.status
        );
      } else if (filters.objectType) {
        // If object type filter is provided
        fetchedObjects = await s2doManager.getObjectsByOwner(
          'user',
          user.id,
          filters.objectType as S2DOObjectType,
          filters.status,
          user.id
        );
      } else {
        // Get all objects owned by user
        fetchedObjects = await s2doManager.getObjectsByOwner(
          'user',
          user.id,
          undefined,
          filters.status,
          user.id
        );
      }
      
      setObjects(fetchedObjects);
      
      // If an object was selected and it's not in the new list, deselect it
      if (selectedObject && !fetchedObjects.find((obj: any) => obj.id === selectedObject.id)) {
        setSelectedObject(null);
      }
    } catch (error: any) {
      console.error('Error fetching S2DO objects:', error);
      setError(error.message || 'Failed to load objects');
    } finally {
      setLoading(false);
    }
  }, [user, filters, selectedObject]);

  // Create a new object
  const createObject = useCallback(async (data: any) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      setLoading(true);
      setError(null);
      
      const {
        objectType,
        content,
        metadata,
        encryptionLevel,
        accessLevel,
        permissions
      } = data;
      
      const newObject = await s2doManager.createObject(
        'user',
        user.id,
        objectType as S2DOObjectType,
        content,
        metadata,
        encryptionLevel as S2DOEncryptionLevel,
        accessLevel as S2DOAccessLevel,
        permissions
      );
      
      // Add the new object to the list
      setObjects(prevObjects => [...prevObjects, newObject]);
      
      return newObject;
    } catch (error: any) {
      console.error('Error creating S2DO object:', error);
      setError(error.message || 'Failed to create object');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Update an object
  const updateObject = useCallback(async (objectId: string, data: any) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      setLoading(true);
      setError(null);
      
      let updatedObject;
      
      // If content is provided, update data
      if (data.content !== undefined) {
        updatedObject = await s2doManager.updateObjectData(
          objectId,
          data.content,
          user.id,
          data.metadata
        );
      } else if (data.metadata) {
        // Otherwise, just update metadata
        updatedObject = await s2doManager.updateObjectMetadata(
          objectId,
          data.metadata,
          user.id
        );
      }
      
      // If permissions are provided, update permissions
      if (data.permissions || data.accessLevel) {
        updatedObject = await s2doManager.updateObjectPermissions(
          objectId,
          data.permissions || {},
          data.accessLevel,
          user.id
        );
      }
      
      // Update the object in the list
      setObjects(prevObjects => 
        prevObjects.map(obj => obj.id === objectId ? updatedObject : obj)
      );
      
      // Update selected object if it's the one being updated
      if (selectedObject && selectedObject.id === objectId) {
        setSelectedObject(updatedObject);
      }
      
      return updatedObject;
    } catch (error: any) {
      console.error('Error updating S2DO object:', error);
      setError(error.message || 'Failed to update object');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, selectedObject]);

  // Delete an object
  const deleteObject = useCallback(async (objectId: string) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await s2doManager.deleteObject(objectId, user.id);
      
      if (result) {
        // Remove the object from the list
        setObjects(prevObjects => prevObjects.filter(obj => obj.id !== objectId));
        
        // Deselect the object if it was selected
        if (selectedObject && selectedObject.id === objectId) {
          setSelectedObject(null);
        }
      }
      
      return result;
    } catch (error: any) {
      console.error('Error deleting S2DO object:', error);
      setError(error.message || 'Failed to delete object');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, selectedObject]);

  // Archive an object
  const archiveObject = useCallback(async (objectId: string) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await s2doManager.archiveObject(objectId, user.id);
      
      if (result) {
        // Remove the object from the active list
        if (filters.status === 'active') {
          setObjects(prevObjects => prevObjects.filter(obj => obj.id !== objectId));
          
          // Deselect the object if it was selected
          if (selectedObject && selectedObject.id === objectId) {
            setSelectedObject(null);
          }
        } else {
          // Refresh the list
          await refreshObjects();
        }
      }
      
      return result;
    } catch (error: any) {
      console.error('Error archiving S2DO object:', error);
      setError(error.message || 'Failed to archive object');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, selectedObject, filters, refreshObjects]);

  // Share an object with users or organizations
  const shareObject = useCallback(async (
    objectId: string, 
    userIds: string[], 
    orgIds: string[]
  ) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      setLoading(true);
      setError(null);
      
      // Get current object permissions
      const objectMetadata = await s2doManager.getObjectMetadata(objectId);
      
      if (!objectMetadata) {
        throw new Error('Object not found');
      }
      
      // Update permissions
      const updatedPermissions = {
        ...objectMetadata.permissions,
        authorizedUsers: [
          ...new Set([...objectMetadata.permissions.authorizedUsers, ...userIds])
        ],
        authorizedOrganizations: [
          ...new Set([...objectMetadata.permissions.authorizedOrganizations, ...orgIds])
        ]
      };
      
      // If sharing with anyone, update access level
      let accessLevel = objectMetadata.accessLevel;
      if (userIds.length > 0 || orgIds.length > 0) {
        accessLevel = S2DOAccessLevel.SHARED;
      }
      
      // Update object permissions
      const updatedObject = await s2doManager.updateObjectPermissions(
        objectId,
        updatedPermissions,
        accessLevel,
        user.id
      );
      
      // Update the object in the list
      setObjects(prevObjects => 
        prevObjects.map(obj => obj.id === objectId ? updatedObject : obj)
      );
      
      // Update selected object if it's the one being updated
      if (selectedObject && selectedObject.id === objectId) {
        setSelectedObject(updatedObject);
      }
      
      return updatedObject;
    } catch (error: any) {
      console.error('Error sharing S2DO object:', error);
      setError(error.message || 'Failed to share object');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, selectedObject]);

  // Verify an object on blockchain
  const verifyObject = useCallback(async (objectId: string) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await s2doManager.verifyObjectOnBlockchain(objectId, user.id);
      
      return result;
    } catch (error: any) {
      console.error('Error verifying S2DO object:', error);
      setError(error.message || 'Failed to verify object');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Set filters
  const setFilters = useCallback((newFilters: Partial<S2DOContextType['filters']>) => {
    setFiltersState(prevFilters => ({
      ...prevFilters,
      ...newFilters
    }));
  }, []);

  const contextValue = useMemo(() => ({
    objects,
    selectedObject,
    loading,
    error,
    filters,
    refreshObjects,
    createObject,
    updateObject,
    deleteObject,
    archiveObject,
    selectObject: setSelectedObject,
    setFilters,
    shareObject,
    verifyObject
  }), [
    objects, 
    selectedObject, 
    loading, 
    error, 
    filters, 
    refreshObjects, 
    createObject, 
    updateObject, 
    deleteObject, 
    archiveObject, 
    setFilters,
    shareObject,
    verifyObject
  ]);

  return (
    <S2DOContext.Provider value={contextValue}>
      {children}
    </S2DOContext.Provider>
  );
};

// Custom hook to use S2DO context
export const useS2DO = () => useContext(S2DOContext);

// S2DO Object List Component
export const S2DOObjectList: React.FC = () => {
  const { 
    objects, 
    selectedObject, 
    loading, 
    error, 
    filters,
    refreshObjects, 
    selectObject,
    setFilters
  } = useS2DO();
  
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null);

  const handleFilterClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setFilterMenuAnchor(event.currentTarget);
  };

  const handleFilterClose = () => {
    setFilterMenuAnchor(null);
  };

  const handleFilterChange = (filterType: keyof S2DOContextType['filters'], value: any) => {
    setFilters({ [filterType]: value });
    handleFilterClose();
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ searchTerm: event.target.value });
  };

  const handleRefresh = () => {
    refreshObjects();
  };

  const getObjectTypeIcon = (objectType: S2DOObjectType) => {
    switch (objectType) {
      case S2DOObjectType.MEMORY:
        return <HistoryIcon />;
      case S2DOObjectType.DREAM:
        return <VisibilityIcon />;
      case S2DOObjectType.DOCUMENT:
        return <FolderSharedIcon />;
      case S2DOObjectType.JOURNAL:
        return <EditIcon />;
      default:
        return <FolderSharedIcon />;
    }
  };

  const getEncryptionIcon = (encryptionLevel: S2DOEncryptionLevel) => {
    switch (encryptionLevel) {
      case S2DOEncryptionLevel.NONE:
        return <LockOpenIcon />;
      case S2DOEncryptionLevel.STANDARD:
        return <LockIcon />;
      case S2DOEncryptionLevel.HIGH:
        return <LockIcon color="primary" />;
      case S2DOEncryptionLevel.ULTRA:
        return <LockIcon color="secondary" />;
      default:
        return <LockOpenIcon />;
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <TextField
          label="Search"
          variant="outlined"
          size="small"
          value={filters.searchTerm}
          onChange={handleSearchChange}
          sx={{ flexGrow: 1, mr: 1 }}
          InputProps={{
            startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
          }}
        />
        <IconButton onClick={handleFilterClick}>
          <FilterListIcon />
        </IconButton>
        <Menu
          anchorEl={filterMenuAnchor}
          open={Boolean(filterMenuAnchor)}
          onClose={handleFilterClose}
        >
          <MenuItem>
            <Typography variant="subtitle2">Object Type</Typography>
          </MenuItem>
          <MenuItem onClick={() => handleFilterChange('objectType', '')}>
            All Types
          </MenuItem>
          <MenuItem onClick={() => handleFilterChange('objectType', S2DOObjectType.MEMORY)}>
            Memories
          </MenuItem>
          <MenuItem onClick={() => handleFilterChange('objectType', S2DOObjectType.DREAM)}>
            Dreams
          </MenuItem>
          <MenuItem onClick={() => handleFilterChange('objectType', S2DOObjectType.DOCUMENT)}>
            Documents
          </MenuItem>
          <MenuItem onClick={() => handleFilterChange('objectType', S2DOObjectType.JOURNAL)}>
            Journals
          </MenuItem>
          <Divider />
          <MenuItem>
            <Typography variant="subtitle2">Status</Typography>
          </MenuItem>
          <MenuItem onClick={() => handleFilterChange('status', 'active')}>
            Active
          </MenuItem>
          <MenuItem onClick={() => handleFilterChange('status', 'archived')}>
            Archived
          </MenuItem>
          <MenuItem onClick={() => handleFilterChange('status', 'deleted')}>
            Deleted
          </MenuItem>
        </Menu>
        <IconButton onClick={handleRefresh}>
          <RefreshIcon />
        </IconButton>
      </Box>

      {error && (
        <Paper sx={{ p: 2, mb: 2, bgcolor: 'error.light', color: 'error.contrastText' }}>
          <Typography>{error}</Typography>
        </Paper>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : objects.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1">No objects found</Typography>
          {filters.objectType || filters.searchTerm || filters.status !== 'active' ? (
            <Button 
              variant="text" 
              onClick={() => setFilters({ objectType: '', searchTerm: '', status: 'active' })}
              sx={{ mt: 1 }}
            >
              Clear Filters
            </Button>
          ) : null}
        </Paper>
      ) : (
        <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
          {objects.map((object) => (
            <ListItem
              key={object.id}
              button
              selected={selectedObject?.id === object.id}
              onClick={() => selectObject(object)}
              divider
            >
              <ListItemIcon>
                {getObjectTypeIcon(object.objectType)}
              </ListItemIcon>
              <ListItemText
                primary={object.metadata.title || `Untitled ${object.objectType}`}
                secondary={
                  <>
                    <Typography component="span" variant="body2" color="text.primary">
                      {new Date(object.createdAt.toDate()).toLocaleString()}
                    </Typography>
                    {' — '}
                    {object.metadata.description ? 
                      object.metadata.description.substring(0, 60) + 
                      (object.metadata.description.length > 60 ? '...' : '') : 
                      'No description'
                    }
                  </>
                }
              />
              <ListItemSecondaryAction>
                <Tooltip title={`Encryption: ${object.encryptionLevel}`}>
                  <IconButton edge="end" sx={{ mr: 1 }}>
                    {getEncryptionIcon(object.encryptionLevel)}
                  </IconButton>
                </Tooltip>
                {object.metadata.blockchainVerification?.hash && (
                  <Tooltip title="Blockchain Verified">
                    <IconButton edge="end" sx={{ mr: 1 }}>
                      <VerifiedIcon color="primary" />
                    </IconButton>
                  </Tooltip>
                )}
                {object.permissions.publicAccess ? (
                  <Tooltip title="Public">
                    <IconButton edge="end">
                      <VisibilityIcon />
                    </IconButton>
                  </Tooltip>
                ) : (
                  <Tooltip title="Private">
                    <IconButton edge="end">
                      <VisibilityOffIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};

// S2DO Object Detail Component
export const S2DOObjectDetail: React.FC = () => {
  const { 
    selectedObject, 
    loading, 
    error,
    updateObject, 
    deleteObject, 
    archiveObject,
    selectObject,
    shareObject,
    verifyObject
  } = useS2DO();
  const [objectData, setObjectData] = useState<any>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedData, setEditedData] = useState<any>({});
  const [shareDialogOpen, setShareDialogOpen] = useState<boolean>(false);
  const [shareUserIds, setShareUserIds] = useState<string>('');
  const [shareOrgIds, setShareOrgIds] = useState<string>('');
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [verificationDialogOpen, setVerificationDialogOpen] = useState<boolean>(false);
  const [currentTab, setCurrentTab] = useState<number>(0);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');

  useEffect(() => {
    // Reset state when selected object changes
    if (selectedObject) {
      // Load object data
      loadObjectData();
    } else {
      setObjectData(null);
      setEditedData({});
      setIsEditing(false);
    }
  }, [selectedObject]);

  const loadObjectData = async () => {
    if (!selectedObject) return;
    
    try {
      // In a real implementation, this would load the actual data
      // For now, we'll just use the metadata
      setObjectData({
        ...selectedObject,
        content: 'This is placeholder content. In a real implementation, this would be loaded from the S2DO system based on the object type.'
      });
    } catch (error) {
      console.error('Error loading object data:', error);
    }
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleEditClick = () => {
    setEditedData({
      metadata: {
        title: selectedObject.metadata.title || '',
        description: selectedObject.metadata.description || '',
        tags: selectedObject.metadata.tags || []
      },
      content: objectData?.content || '',
      accessLevel: selectedObject.accessLevel
    });
    setIsEditing(true);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditedData({});
  };

  const handleEditSave = async () => {
    try {
      await updateObject(selectedObject.id, {
        metadata: editedData.metadata,
        content: editedData.content,
        accessLevel: editedData.accessLevel
      });
      
      setIsEditing(false);
      setSnackbarMessage('Object updated successfully');
      setSnackbarOpen(true);
      
      // Reload object data
      loadObjectData();
    } catch (error) {
      console.error('Error updating object:', error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    if (field.startsWith('metadata.')) {
      const metadataField = field.split('.')[1];
      setEditedData({
        ...editedData,
        metadata: {
          ...editedData.metadata,
          [metadataField]: value
        }
      });
    } else {
      setEditedData({
        ...editedData,
        [field]: value
      });
    }
  };

  const handleShareClick = () => {
    setShareUserIds('');
    setShareOrgIds('');
    setShareDialogOpen(true);
  };

  const handleShareSubmit = async () => {
    try {
      const userIds = shareUserIds.split(',').map(id => id.trim()).filter(id => id);
      const orgIds = shareOrgIds.split(',').map(id => id.trim()).filter(id => id);
      
      await shareObject(selectedObject.id, userIds, orgIds);
      
      setShareDialogOpen(false);
      setSnackbarMessage('Object shared successfully');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error sharing object:', error);
    }
  };

  const handleVerifyClick = async () => {
    try {
      const result = await verifyObject(selectedObject.id);
      setVerificationResult(result);
      setVerificationDialogOpen(true);
    } catch (error) {
      console.error('Error verifying object:', error);
    }
  };

  const handleDeleteClick = async () => {
    try {
      await deleteObject(selectedObject.id);
      setSnackbarMessage('Object deleted successfully');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error deleting object:', error);
    }
  };

  const handleArchiveClick = async () => {
    try {
      await archiveObject(selectedObject.id);
      setSnackbarMessage('Object archived successfully');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error archiving object:', error);
    }
  };

  const handleActionMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setActionMenuAnchor(event.currentTarget);
  };

  const handleActionMenuClose = () => {
    setActionMenuAnchor(null);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  if (!selectedObject) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Typography variant="body1">Select an object to view details</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Card>
        <CardHeader
          title={isEditing ? (
            <TextField
              fullWidth
              label="Title"
              value={editedData.metadata.title}
              onChange={(e) => handleInputChange('metadata.title', e.target.value)}
            />
          ) : (
            selectedObject.metadata.title || `Untitled ${selectedObject.objectType}`
          )}
          subheader={`Created: ${new Date(selectedObject.createdAt.toDate()).toLocaleString()}`}
          action={
            <>
              {!isEditing ? (
                <>
                  <IconButton onClick={handleEditClick}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={handleShareClick}>
                    <ShareIcon />
                  </IconButton>
                  <IconButton onClick={handleActionMenuOpen}>
                    <MoreVertIcon />
                  </IconButton>
                  <Menu
                    anchorEl={actionMenuAnchor}
                    open={Boolean(actionMenuAnchor)}
                    onClose={handleActionMenuClose}
                  >
                    {selectedObject.metadata.blockchainVerification?.hash && (
                      <MenuItem onClick={handleVerifyClick}>
                        <VerifiedUserIcon sx={{ mr: 1 }} />
                        Verify on Blockchain
                      </MenuItem>
                    )}
                    <MenuItem onClick={handleArchiveClick}>
                      <HistoryIcon sx={{ mr: 1 }} />
                      Archive
                    </MenuItem>
                    <MenuItem onClick={handleDeleteClick}>
                      <DeleteIcon sx={{ mr: 1 }} />
                      Delete
                    </MenuItem>
                  </Menu>
                </>
              ) : (
                <>
                  <Button onClick={handleEditSave} color="primary">
                    Save
                  </Button>
                  <Button onClick={handleEditCancel} color="secondary">
                    Cancel
                  </Button>
                </>
              )}
            </>
          }
        />
        
        <CardContent>
          {error && (
            <Paper sx={{ p: 2, mb: 2, bgcolor: 'error.light', color: 'error.contrastText' }}>
              <Typography>{error}</Typography>
            </Paper>
          )}
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Tabs value={currentTab} onChange={handleTabChange} sx={{ mb: 2 }}>
                <Tab label="Details" />
                <Tab label="Content" />
                <Tab label="Permissions" />
                {selectedObject.metadata.blockchainVerification?.hash && (
                  <Tab label="Blockchain" />
                )}
              </Tabs>
              
              {/* Details Tab */}
              {currentTab === 0 && (
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1">Description</Typography>
                    {isEditing ? (
                      <TextField
                        fullWidth
                        multiline
                        rows={4}
                        value={editedData.metadata.description}
                        onChange={(e) => handleInputChange('metadata.description', e.target.value)}
                      />
                    ) : (
                      <Typography variant="body1">
                        {selectedObject.metadata.description || 'No description'}
                      </Typography>
                    )}
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle1">Object Type</Typography>
                    <Typography variant="body1">{selectedObject.objectType}</Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle1">Encryption Level</Typography>
                    <Typography variant="body1">{selectedObject.encryptionLevel}</Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle1">Created</Typography>
                    <Typography variant="body1">
                      {new Date(selectedObject.createdAt.toDate()).toLocaleString()}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle1">Last Updated</Typography>
                    <Typography variant="body1">
                      {new Date(selectedObject.updatedAt.toDate()).toLocaleString()}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Typography variant="subtitle1">Tags</Typography>
                    {isEditing ? (
                      <TextField
                        fullWidth
                        placeholder="Comma-separated tags"
                        value={editedData.metadata.tags ? editedData.metadata.tags.join(', ') : ''}
                        onChange={(e) => handleInputChange(
                          'metadata.tags', 
                          e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)
                        )}
                      />
                    ) : (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {selectedObject.metadata.tags && selectedObject.metadata.tags.length > 0 ? (
                          selectedObject.metadata.tags.map((tag: string) => (
                            <Chip key={tag} label={tag} size="small" />
                          ))
                        ) : (
                          <Typography variant="body2">No tags</Typography>
                        )}
                      </Box>
                    )}
                  </Grid>
                </Grid>
              )}
              
              {/* Content Tab */}
              {currentTab === 1 && (
                <Box>
                  {isEditing ? (
                    <TextField
                      fullWidth
                      multiline
                      rows={8}
                      value={editedData.content}
                      onChange={(e) => handleInputChange('content', e.target.value)}
                    />
                  ) : (
                    <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                        {objectData?.content || 'Loading content...'}
                      </Typography>
                    </Paper>
                  )}
                </Box>
              )}
              
              {/* Permissions Tab */}
              {currentTab === 2 && (
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControl component="fieldset">
                      <FormLabel component="legend">Access Level</FormLabel>
                      {isEditing ? (
                        <RadioGroup
                          value={editedData.accessLevel}
                          onChange={(e) => handleInputChange('accessLevel', e.target.value)}
                        >
                          <FormControlLabel
                            value={S2DOAccessLevel.PRIVATE}
                            control={<Radio />}
                            label="Private"
                          />
                          <FormControlLabel
                            value={S2DOAccessLevel.SHARED}
                            control={<Radio />}
                            label="Shared"
                          />
                          <FormControlLabel
                            value={S2DOAccessLevel.PUBLIC}
                            control={<Radio />}
                            label="Public"
                          />
                        </RadioGroup>
                      ) : (
                        <Typography variant="body1">{selectedObject.accessLevel}</Typography>
                      )}
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Typography variant="subtitle1">Authorized Users</Typography>
                    {selectedObject.permissions.authorizedUsers && 
                     selectedObject.permissions.authorizedUsers.length > 0 ? (
                      <List>
                        {selectedObject.permissions.authorizedUsers.map((userId: string) => (
                          <ListItem key={userId}>
                            <ListItemText primary={userId} />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Typography variant="body2">No authorized users</Typography>
                    )}
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Typography variant="subtitle1">Authorized Organizations</Typography>
                    {selectedObject.permissions.authorizedOrganizations && 
                     selectedObject.permissions.authorizedOrganizations.length > 0 ? (
                      <List>
                        {selectedObject.permissions.authorizedOrganizations.map((orgId: string) => (
                          <ListItem key={orgId}>
                            <ListItemText primary={orgId} />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Typography variant="body2">No authorized organizations</Typography>
                    )}
                  </Grid>
                </Grid>
              )}
              
              {/* Blockchain Tab */}
              {currentTab === 3 && selectedObject.metadata.blockchainVerification?.hash && (
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1">Verification Hash</Typography>
                    <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                      {selectedObject.metadata.blockchainVerification.hash}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Typography variant="subtitle1">Transaction ID</Typography>
                    <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                      {selectedObject.metadata.blockchainVerification.transactionId}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Typography variant="subtitle1">Timestamp</Typography>
                    <Typography variant="body1">
                      {selectedObject.metadata.blockchainVerification.timestamp ? 
                        new Date(selectedObject.metadata.blockchainVerification.timestamp.toDate()).toLocaleString() : 
                        'N/A'
                      }
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<VerifiedUserIcon />}
                      onClick={handleVerifyClick}
                    >
                      Verify on Blockchain
                    </Button>
                  </Grid>
                </Grid>
              )}
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)}>
        <DialogTitle>Share Object</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="User IDs (comma-separated)"
            value={shareUserIds}
            onChange={(e) => setShareUserIds(e.target.value)}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Organization IDs (comma-separated)"
            value={shareOrgIds}
            onChange={(e) => setShareOrgIds(e.target.value)}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleShareSubmit} color="primary">Share</Button>
        </DialogActions>
      </Dialog>
      
      {/* Verification Dialog */}
      <Dialog open={verificationDialogOpen} onClose={() => setVerificationDialogOpen(false)}>
        <DialogTitle>Blockchain Verification Result</DialogTitle>
        <DialogContent>
          {verificationResult && (
            <>
              <Typography variant="h6" color={verificationResult.verified ? 'success.main' : 'error.main'}>
                {verificationResult.verified ? 'Verified' : 'Not Verified'}
              </Typography>
              
              {verificationResult.details && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle1">Verification Details</Typography>
                  <Paper sx={{ p: 2, mt: 1, bgcolor: 'background.paper' }}>
                    <pre>{JSON.stringify(verificationResult.details, null, 2)}</pre>
                  </Paper>
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVerificationDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        message={snackbarMessage}
      />
    </Box>
  );
};

// S2DO Create Object Component
export const S2DOCreateObject: React.FC<{ onSuccess?: () => void }> = ({ onSuccess }) => {
  const { createObject } = useS2DO();
  const [formData, setFormData] = useState({
    objectType: S2DOObjectType.DOCUMENT,
    title: '',
    description: '',
    tags: '',
    content: '',
    encryptionLevel: S2DOEncryptionLevel.STANDARD,
    accessLevel: S2DOAccessLevel.PRIVATE
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleInputChange = (field: string, value: any) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      const newObject = await createObject({
        objectType: formData.objectType,
        content: formData.content,
        metadata: {
          title: formData.title,
          description: formData.description,
          tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
        },
        encryptionLevel: formData.encryptionLevel,
        accessLevel: formData.accessLevel,
        permissions: {
          publicAccess: formData.accessLevel === S2DOAccessLevel.PUBLIC
        }
      });
      
      setSuccess(true);
      
      // Reset form
      setFormData({
        objectType: S2DOObjectType.DOCUMENT,
        title: '',
        description: '',
        tags: '',
        content: '',
        encryptionLevel: S2DOEncryptionLevel.STANDARD,
        accessLevel: S2DOAccessLevel.PRIVATE
      });
      
      if (onSuccess) {
        onSuccess();
      }
      
      return newObject;
    } catch (error: any) {
      console.error('Error creating object:', error);
      setError(error.message || 'Failed to create object');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Card>
        <CardHeader title="Create New S2DO Object" />
        <CardContent>
          {error && (
            <Paper sx={{ p: 2, mb: 2, bgcolor: 'error.light', color: 'error.contrastText' }}>
              <Typography>{error}</Typography>
            </Paper>
          )}
          
          {success && (
            <Paper sx={{ p: 2, mb: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
              <Typography>Object created successfully!</Typography>
            </Paper>
          )}
          
          <form onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Object Type</InputLabel>
                  <Select
                    value={formData.objectType}
                    onChange={(e) => handleInputChange('objectType', e.target.value)}
                    label="Object Type"
                  >
                    <MenuItem value={S2DOObjectType.DOCUMENT}>Document</MenuItem>
                    <MenuItem value={S2DOObjectType.MEMORY}>Memory</MenuItem>
                    <MenuItem value={S2DOObjectType.DREAM}>Dream</MenuItem>
                    <MenuItem value={S2DOObjectType.JOURNAL}>Journal</MenuItem>
                    <MenuItem value={S2DOObjectType.CONTENT}>Content</MenuItem>
                    <MenuItem value={S2DOObjectType.VISUALIZATION}>Visualization</MenuItem>
                    <MenuItem value={S2DOObjectType.PROFILE}>Profile</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Encryption Level</InputLabel>
                  <Select
                    value={formData.encryptionLevel}
                    onChange={(e) => handleInputChange('encryptionLevel', e.target.value)}
                    label="Encryption Level"
                  >
                    <MenuItem value={S2DOEncryptionLevel.NONE}>None</MenuItem>
                    <MenuItem value={S2DOEncryptionLevel.STANDARD}>Standard</MenuItem>
                    <MenuItem value={S2DOEncryptionLevel.HIGH}>High</MenuItem>
                    <MenuItem value={S2DOEncryptionLevel.ULTRA}>Ultra</MenuItem>
                  </Select>
                  <FormHelperText>
                    {formData.encryptionLevel === S2DOEncryptionLevel.NONE && 'No encryption - data stored as plain text'}
                    {formData.encryptionLevel === S2DOEncryptionLevel.STANDARD && 'Standard AES-256 encryption'}
                    {formData.encryptionLevel === S2DOEncryptionLevel.HIGH && 'Triple-layer encryption with multiple keys'}
                    {formData.encryptionLevel === S2DOEncryptionLevel.ULTRA && 'Maximum security with multi-algorithm encryption'}
                  </FormHelperText>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  margin="normal"
                  required
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  margin="normal"
                  multiline
                  rows={2}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Tags (comma-separated)"
                  value={formData.tags}
                  onChange={(e) => handleInputChange('tags', e.target.value)}
                  margin="normal"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Content"
                  value={formData.content}
                  onChange={(e) => handleInputChange('content', e.target.value)}
                  margin="normal"
                  multiline
                  rows={6}
                  required
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControl component="fieldset" margin="normal">
                  <FormLabel component="legend">Access Level</FormLabel>
                  <RadioGroup
                    value={formData.accessLevel}
                    onChange={(e) => handleInputChange('accessLevel', e.target.value)}
                  >
                    <FormControlLabel
                      value={S2DOAccessLevel.PRIVATE}
                      control={<Radio />}
                      label="Private (only you can access)"
                    />
                    <FormControlLabel
                      value={S2DOAccessLevel.SHARED}
                      control={<Radio />}
                      label="Shared (you and specific users/organizations)"
                    />
                    <FormControlLabel
                      value={S2DOAccessLevel.PUBLIC}
                      control={<Radio />}
                      label="Public (accessible to all users)"
                    />
                  </RadioGroup>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
                >
                  Create Object
                </Button>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

// S2DO Dashboard Component
export const S2DODashboard: React.FC = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  const handleCreateSuccess = () => {
    setCreateDialogOpen(false);
  };
  
  return (
    <S2DOProvider>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">Secure Data Objects</Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create New
          </Button>
        </Box>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, height: '70vh', overflow: 'auto' }}>
              <S2DOObjectList />
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2, height: '70vh', overflow: 'auto' }}>
              <S2DOObjectDetail />
            </Paper>
          </Grid>
        </Grid>
        
        <Dialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogContent>
            <S2DOCreateObject onSuccess={handleCreateSuccess} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </S2DOProvider>
  );
};

export default {
  S2DOProvider,
  useS2DO,
  S2DOObjectList,
  S2DOObjectDetail,
  S2DOCreateObject,
  S2DODashboard
};
