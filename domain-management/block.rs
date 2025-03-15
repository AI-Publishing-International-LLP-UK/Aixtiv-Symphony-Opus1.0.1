fn process_json_output(output: &str) -> anyhow::Result<String> {
    // Attempt to clean up any non-JSON prefixes/suffixes
    let cleaned = output
        .lines()
        .filter(|line| line.trim_start().starts_with('{'))
        .collect::<String>();
    
    // Parse and re-serialize to ensure valid JSON
    let value: serde_json::Value = serde_json::from_str(&cleaned)?;
    Ok(serde_json::to_string(&value)?)
}

fn convert_results_to_map(
    results: Vec<(
        Vec<u8>,
        String, 
        String,
        chrono::NaiveDateTime,
        String,
        String,
        Option<String>,
    )>,
) -> Result<HashMap<PaneUuid, Vec<PersistedAIBlock>>, diesel::result::Error> {
    let mut pane_to_ai_blocks: HashMap<PaneUuid, Vec<PersistedAIBlock>> = HashMap::new();

    for (uuid, exchange_id, conversation_id, start_ts, input, output, _working_directory) in results {
        if let Err(error) = (|| -> anyhow::Result<()> {
            // Process input and output JSON
            let input = process_json_output(&input)?;
            let output = process_json_output(&output)?;

            let ai_block = PersistedAIBlock {
                exchange_id: AIAgentExchangeId::try_from(exchange_id)?,
                session_uuid: uuid.clone(),
                output: serde_json::from_str(&output)?,
                conversation_id: AIConversationId::try_from(conversation_id)?,
                start_ts: Local.from_utc_datetime(&start_ts),
                input: serde_json::from_str(&input)?,
            };

            pane_to_ai_blocks
                .entry(PaneUuid(uuid))
                .and_modify(|ai_blocks| ai_blocks.push(ai_block.clone()))
                .or_insert(vec![ai_block]);
            Ok(())
        })() {
            log::warn!("failed to read AI block from SQLite: {}", error);
        }
    }

    Ok(pane_to_ai_blocks)
}
