# Special Character Domain Mapping

Generated: 2025-05-31T15:02:59.134Z

This document maps domains containing special characters to their Firebase-compatible site IDs.

## Mapping Table

| Original Domain | Punycode | Site ID |
|----------------|----------|--------|
| café.example.com | xn--caf-dma.example.com | xn--caf-dma-example-com |
| prepárate.org | xn--preprate-cza.org | xn--preprate-cza-org |

## Usage Notes

When working with these domains:

1. In Firebase CLI commands, use the Site ID
2. In domain registrars, use the Punycode version
3. In URLs and marketing, use the Original Domain

## Special Character Handling

Special characters in domain names (like accents) are converted to punycode for DNS compatibility.
The Site ID is derived from the punycode version with additional transformations to ensure Firebase compatibility.
