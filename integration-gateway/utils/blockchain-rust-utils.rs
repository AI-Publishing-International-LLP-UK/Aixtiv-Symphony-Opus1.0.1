use std::collections::HashMap;
use serde::{Serialize, Deserialize};

// Assuming these are the types used in your blockchain implementation
// Replace with your actual types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockResult {
    pub id: String,
    pub hash: String,
    pub timestamp: u64,
    pub data: Vec<u8>,
    pub metadata: Option<BlockMetadata>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockMetadata {
    pub author: String,
    pub version: String,
    pub transactions_count: u32,
}

/// Converts a vector of BlockResult objects into a HashMap keyed by block ID
/// 
/// This function is useful for quickly accessing block data by ID without
/// having to iterate through the entire vector each time.
/// 
/// # Arguments
/// 
/// * `results` - A vector of BlockResult objects to be converted
/// 
/// # Returns
/// 
/// A HashMap where the keys are block IDs and the values are the corresponding BlockResult objects
pub fn convert_results_to_map(results: Vec<BlockResult>) -> HashMap<String, BlockResult> {
    let mut map = HashMap::with_capacity(results.len());
    
    for result in results {
        map.insert(result.id.clone(), result);
    }
    
    map
}

/// Converts a vector of any type into a HashMap using a key extractor function
/// 
/// This is a more generic version of convert_results_to_map that can work with any type
/// as long as a function is provided to extract the key.
/// 
/// # Arguments
/// 
/// * `items` - A vector of items to be converted
/// * `key_fn` - A function that takes a reference to an item and returns a String key
/// 
/// # Returns
/// 
/// A HashMap where the keys are determined by key_fn and the values are the items
pub fn convert_to_map<T, F>(items: Vec<T>, key_fn: F) -> HashMap<String, T> 
where
    F: Fn(&T) -> String
{
    let mut map = HashMap::with_capacity(items.len());
    
    for item in items {
        let key = key_fn(&item);
        map.insert(key, item);
    }
    
    map
}

/// Enhanced version that can handle optional validation and transformation
pub fn convert_results_to_map_with_options<F, T>(
    results: Vec<BlockResult>,
    validator: Option<F>,
    transformer: Option<T>
) -> HashMap<String, BlockResult>
where
    F: Fn(&BlockResult) -> bool,
    T: Fn(BlockResult) -> BlockResult
{
    let mut map = HashMap::with_capacity(results.len());
    
    for result in results {
        // Skip invalid results if validator is provided
        if let Some(ref validate) = validator {
            if !validate(&result) {
                continue;
            }
        }
        
        // Apply transformation if transformer is provided
        let result = if let Some(ref transform) = transformer {
            transform(result)
        } else {
            result
        };
        
        map.insert(result.id.clone(), result);
    }
    
    map
}

/// Groups block results by a specific property
pub fn group_results_by<F, K>(results: &[BlockResult], key_fn: F) -> HashMap<K, Vec<BlockResult>>
where
    F: Fn(&BlockResult) -> K,
    K: std::hash::Hash + Eq,
{
    let mut groups = HashMap::new();
    
    for result in results {
        let key = key_fn(result);
        groups.entry(key)
            .or_insert_with(Vec::new)
            .push(result.clone());
    }
    
    groups
}

/// Indexes block results for efficient multi-key lookup
pub struct BlockResultIndex {
    by_id: HashMap<String, BlockResult>,
    by_hash: HashMap<String, String>, // Maps hash to ID
    by_timestamp: HashMap<u64, Vec<String>>, // Maps timestamp to list of IDs
}

impl BlockResultIndex {
    pub fn new(results: Vec<BlockResult>) -> Self {
        let mut by_id = HashMap::with_capacity(results.len());
        let mut by_hash = HashMap::with_capacity(results.len());
        let mut by_timestamp = HashMap::new();
        
        for result in results {
            // Index by hash
            by_hash.insert(result.hash.clone(), result.id.clone());
            
            // Index by timestamp
            by_timestamp.entry(result.timestamp)
                .or_insert_with(Vec::new)
                .push(result.id.clone());
            
            // Index by ID (primary)
            by_id.insert(result.id.clone(), result);
        }
        
        Self {
            by_id,
            by_hash,
            by_timestamp,
        }
    }
    
    pub fn get_by_id(&self, id: &str) -> Option<&BlockResult> {
        self.by_id.get(id)
    }
    
    pub fn get_by_hash(&self, hash: &str) -> Option<&BlockResult> {
        let id = self.by_hash.get(hash)?;
        self.by_id.get(id)
    }
    
    pub fn get_by_timestamp(&self, timestamp: u64) -> Vec<&BlockResult> {
        match self.by_timestamp.get(&timestamp) {
            Some(ids) => ids.iter()
                .filter_map(|id| self.by_id.get(id))
                .collect(),
            None => Vec::new(),
        }
    }
    
    pub fn get_in_timestamp_range(&self, start: u64, end: u64) -> Vec<&BlockResult> {
        let mut results = Vec::new();
        
        for timestamp in start..=end {
            if let Some(ids) = self.by_timestamp.get(&timestamp) {
                for id in ids {
                    if let Some(result) = self.by_id.get(id) {
                        results.push(result);
                    }
                }
            }
        }
        
        results
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_convert_results_to_map() {
        let results = vec![
            BlockResult {
                id: "block1".to_string(),
                hash: "hash1".to_string(),
                timestamp: 100,
                data: vec![1, 2, 3],
                metadata: None,
            },
            BlockResult {
                id: "block2".to_string(),
                hash: "hash2".to_string(),
                timestamp: 200,
                data: vec![4, 5, 6],
                metadata: None,
            },
        ];
        
        let map = convert_results_to_map(results.clone());
        
        assert_eq!(map.len(), 2);
        assert_eq!(map.get("block1").unwrap().hash, "hash1");
        assert_eq!(map.get("block2").unwrap().hash, "hash2");
    }
    
    #[test]
    fn test_group_results_by() {
        let results = vec![
            BlockResult {
                id: "block1".to_string(),
                hash: "hash1".to_string(),
                timestamp: 100,
                data: vec![1, 2, 3],
                metadata: None,
            },
            BlockResult {
                id: "block2".to_string(),
                hash: "hash2".to_string(),
                timestamp: 100, // Same timestamp as block1
                data: vec![4, 5, 6],
                metadata: None,
            },
            BlockResult {
                id: "block3".to_string(),
                hash: "hash3".to_string(),
                timestamp: 200,
                data: vec![7, 8, 9],
                metadata: None,
            },
        ];
        
        let groups = group_results_by(&results, |r| r.timestamp);
        
        assert_eq!(groups.len(), 2); // Two unique timestamps
        assert_eq!(groups.get(&100).unwrap().len(), 2); // Two blocks with timestamp 100
        assert_eq!(groups.get(&200).unwrap().len(), 1); // One block with timestamp 200
    }
}
