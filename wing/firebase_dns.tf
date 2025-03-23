# Google Cloud provider configuration
provider "google" {
  # Specify your GCP project ID here
  # project = "api-for-warp-drive

"
  # region  = "us-central1"  # Optional: Specify your preferred region
}

# Domain ownership verification
resource "google_dns_record_set" "firebase_verification" {
  name         = "coaching2100.com."
  managed_zone = "coaching2100-com"  # Replace with your GCP DNS zone name (without the .com part)
  type         = "TXT"
  ttl          = 3600
  rrdatas      = ["hosting-site=coaching2100"]
}

# SSL certificate verification
resource "google_dns_record_set" "firebase_ssl_verification" {
  name         = "_acme-challenge.coaching2100.com."
  managed_zone = "coaching2100-com"  # Replace with your GCP DNS zone name
  type         = "TXT"
  ttl          = 3600
  rrdatas      = ["9h3D9KeeK8thENVoCwHro4a_GCgL3J8-lKKbQRqMTvI"]
}

# Main domain A record
resource "google_dns_record_set" "firebase_main" {
  name         = "coaching2100.com."
  managed_zone = "coaching2100-com"  # Replace with your GCP DNS zone name
  type         = "A"
  ttl          = 3600
  rrdatas      = ["199.36.158.100"]
}

# Panel subdomain (Choose one of these options)

# Option A: CNAME record for panel subdomain (recommended)
resource "google_dns_record_set" "firebase_panel" {
  name         = "panel.coaching2100.com."
  managed_zone = "coaching2100-com"  # Replace with your GCP DNS zone name
  type         = "CNAME"
  ttl          = 3600
  rrdatas      = ["coaching2100-com.web.app."]  # Ensure this matches your actual Firebase hosting endpoint
}

# Option B: A record for panel subdomain
# resource "google_dns_record_set" "firebase_panel_a" {
#   name         = "panel.coaching2100.com."
#   managed_zone = "coaching2100-com"  # Replace with your GCP DNS zone name
#   type         = "A"
#   ttl          = 3600
#   rrdatas      = ["199.36.158.100"]
# }

# Firebase DNS Configuration for coaching2100.com

# Domain ownership verification
resource "dns_txt_record" "firebase_verification" {
  zone_name = "coaching2100.com."
  name      = "@"  # Use empty string or "@" for root domain
  txt       = ["hosting-site=coaching2100"]
  ttl       = 3600
}

# SSL certificate verification
resource "dns_txt_record" "firebase_ssl_verification" {
  zone_name = "coaching2100.com."
  name      = "_acme-challenge"
  txt       = ["9h3D9KeeK8thENVoCwHro4a_GCgL3J8-lKKbQRqMTvI"]
  ttl       = 3600
}

# Main domain A record
resource "dns_a_record" "firebase_main" {
  zone_name = "coaching2100.com."
  name      = "@"  # Use empty string or "@" for root domain
  addresses = ["199.36.158.100"]
  ttl       = 3600
}

# Panel subdomain - CNAME record (recommended option)
resource "dns_cname_record" "firebase_panel" {
  zone_name = "coaching2100.com."
  name      = "panel"
  cname     = "coaching2100-com.web.app."  # Firebase hosting endpoint
  ttl       = 3600
}

# Alternative option (commented out) - A record for panel subdomain
# Uncomment this and comment out the CNAME record above if you prefer to use an A record
# resource "dns_a_record" "firebase_panel" {
#   zone_name = "coaching2100.com."
#   name      = "panel"
#   addresses = ["199.36.158.100"]
#   ttl       = 3600
# }

