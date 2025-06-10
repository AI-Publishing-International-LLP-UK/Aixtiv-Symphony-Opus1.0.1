from google.cloud import billing
from datetime import datetime, timedelta
import pandas as pd

def get_billing_accounts():
    """List all available billing accounts."""
    try:
        client = billing.CloudBillingClient()
        accounts = client.list_billing_accounts()
        return [account for account in accounts]
    except Exception as e:
        print(f"Error listing billing accounts: {str(e)}")
        return []

def format_currency(amount, currency):
    """Format currency with proper symbols and thousand separators."""
    symbols = {'USD': '$', 'EUR': '€', 'GBP': '£'}
    symbol = symbols.get(currency, '')
    return f"{symbol}{amount:,.2f}"

def analyze_billing_costs():
    try:
        # Initialize the Cloud Billing API client
        client = billing.CloudBillingClient()
        
        # Set billing account and project details
        billing_account = "billingAccounts/01BF71-1BD1E5-18C1E8"
        project_id = "api-for-warp-drive"

        # List available billing accounts
        print("\nAvailable Billing Accounts:")
        accounts = get_billing_accounts()
        for account in accounts:
            print(f"- {account.name}: {account.display_name}")
    
    try:
        # Calculate date range (last 30 days)
        end_time = datetime.now()
        start_time = end_time - timedelta(days=30)
        
        # Prepare the request
        request = {
            "name": billing_account,
            "filter": f'projects.id="{project_id}"',
            "interval": {
                "start_time": start_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "end_time": end_time.strftime("%Y-%m-%dT%H:%M:%SZ")
            }
        }
        
        # Get cost information
        cost_data = []
        for page in client.list_billing_account_costs(request).pages:
            for cost in page.cost_detail:
                cost_data.append({
                    'service': cost.service.name,
                    'cost': cost.cost.units + cost.cost.nanos / 1e9,
                    'currency': cost.cost.currency_code
                })
        
        # Convert to pandas DataFrame for better formatting
        df = pd.DataFrame(cost_data)
        
        # Group by service and sum costs
        service_costs = df.groupby('service').agg({
            'cost': 'sum',
            'currency': 'first'
        }).reset_index()
        
        # Sort by cost in descending order
        service_costs = service_costs.sort_values('cost', ascending=False)
        
        # Print results
        print("\nCost Analysis Report")
        print("===================")
        print(f"Period: {start_time.date()} to {end_time.date()}")
        print(f"Project: {project_id}")
        print("\nCosts by Service:")
        for _, row in service_costs.iterrows():
            formatted_cost = format_currency(row['cost'], row['currency'])
            service_name = row['service'].replace('services/', '')
            print(f"{service_name:<40} {formatted_cost:>15}")

        # Print total cost
        total_cost = service_costs['cost'].sum()
        formatted_total = format_currency(total_cost, service_costs['currency'].iloc[0])
        print("\n" + "="*55)
        print(f"{'Total Cost:':<40} {formatted_total:>15}")
        
    except Exception as e:
        print(f"Error analyzing billing costs:")
        print(f"Type: {type(e).__name__}")
        print(f"Details: {str(e)}")
        print("\nPlease ensure you have proper authentication and billing permissions.")
        print("Run 'gcloud auth application-default login' if needed.")

if __name__ == "__main__":
    analyze_billing_costs()

