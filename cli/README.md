# GoDaddy CLI Tool

A command-line interface for managing GoDaddy domains and DNS records.

## Installation

```bash
npm install
npm run build
```

## Configuration

Set the following environment variables:
- `GODADDY_API_KEY`: Your GoDaddy API key
- `GODADDY_API_SECRET`: Your GoDaddy API secret

## Usage

### List Domains

```bash
godaddy list-domains
```

### Update DNS Records

Update a single domain:
```bash
godaddy update-dns --domains example.com --type CNAME --name www --value ghs.googlehosted.com
```

Update multiple domains from a file:
```bash
godaddy update-dns --file domains.txt --type CNAME --name www --value ghs.googlehosted.com
```

### Add Google Verification

Add verification for a single domain:
```bash
godaddy verify --domains example.com --verification google-site-verification=XXXXX
```

Add verification for multiple domains from a file:
```bash
godaddy verify --file domains.txt --verification google-site-verification=XXXXX
```

## Options

### Global Options
- `-h, --help`: Display help information
- `-v, --version`: Display version information

### DNS Update Options
- `-f, --file <path>`: Path to file containing list of domains
- `-d, --domains <domains...>`: Space-separated list of domains
- `-t, --type <type>`: DNS record type (A, CNAME, TXT, etc.)
- `-n, --name <name>`: DNS record name (@ for root)
- `-v, --value <value>`: DNS record value
- `--ttl <ttl>`: TTL in seconds (default: 3600)

### Verification Options
- `-f, --file <path>`: Path to file containing list of domains
- `-d, --domains <domains...>`: Space-separated list of domains
- `-v, --verification <code>`: Google verification code

## Example Domain File Format

```text
example1.com
example2.com
example3.com
```

## Error Handling

The CLI provides detailed error messages for common issues:
- Configuration errors (missing or invalid credentials)
- Validation errors (invalid input)
- API errors (rate limiting, authentication, etc.)
- Network errors

## Progress Tracking

All bulk operations include:
- Progress bars showing completion status
- Success/failure summaries
- Detailed error reporting for failed operations

# GoDaddy CLI Tool

A command-line interface for managing GoDaddy domains and DNS records.

## Features

- Bulk DNS record management
- Domain verification
- DNS propagation checking
- Support for reading domain lists from files
- Progress tracking for long-running operations
- Dry run mode for safe testing

## Installation

```bash
npm install
npm run build
```

## Usage

### Add DNS Records

Add DNS records to one or more domains:

```bash
godaddy-cli add-dns example.com,example.org -t A -n @ -d "1.2.3.4"
```

Or use a file containing domains:

```bash
godaddy-cli add-dns domains.txt -t CNAME -n www -d "example.com"
```

### List DNS Records

View DNS records for domains:

```bash
godaddy-cli list-dns example.com,example.org
```

Filter by record type:

```bash
godaddy-cli list-dns example.com -t A
```

### Verify Domains

Add domain verification records:

```bash
godaddy-cli verify-domains domains.txt --verification-code "google-site-verification=xxx"
```

### Check DNS Propagation

Monitor DNS propagation status:

```bash
godaddy-cli check-propagation domains.txt -t CNAME -n www
```

## Options

Common options available for most commands:

- `--dry-run`: Preview changes without making them
- `-t, --type`: DNS record type (A, CNAME, TXT, etc.)
- `-n, --name`: Record name/hostname
- `-d, --data`: Record data/value
- `-l, --ttl`: Time to live in seconds

## Domain List Files

Create a text file with one domain per line:

```text
example.com
example.org
example.net
```

## Error Handling

The CLI provides detailed error messages and validates:
- Domain format
- Required parameters
- API responses
- DNS record validity

## Contributing

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## License

MIT

