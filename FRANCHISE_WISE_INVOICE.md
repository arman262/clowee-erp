# Franchise Wise Invoice

## Overview
This feature allows generating consolidated invoices for franchises that have multiple machines. Instead of creating separate invoices for each machine, franchises can receive a single consolidated invoice covering all their machines for a specific period (half-month or full-month).

## Key Features

### 1. Consolidated Invoice Generation
- **Single Invoice**: One invoice per franchise instead of multiple machine invoices
- **Period-based**: Half-monthly (1-15, 16-end of month) or full monthly periods
- **Multi-machine Support**: Aggregates data from all machines under a franchise
- **Standard Format**: Professional invoice layout similar to individual machine invoices

### 2. Franchise Selection & Filtering
- **Franchise Dropdown**: Select specific franchise for invoice generation
- **Date Range Selector**: Choose half-month or full-month periods
- **Machine Preview**: Shows list of machines that will be included
- **Period Validation**: Ensures selected period matches franchise payment duration settings

### 3. Data Aggregation & Calculations
- **Consolidated Totals**: 
  - Total coin sales across all machines
  - Total prize out quantity across all machines
  - Total sales amount for the franchise
  - Total pay to Clowee amount
- **Individual Machine Breakdown**: Each machine's contribution shown separately
- **Profit Sharing**: Calculated based on franchise agreement rates
- **Payment Status**: Shows consolidated payment status for the franchise

### 4. Invoice Layout Structure

#### Header Section
- Franchise name and details
- Consolidated invoice number
- Billing period (half-month/full-month)
- Invoice date

#### Machine Breakdown Table
| Machine Name | Coin Sales | Sales Amount | Prize Out | Prize Cost | Pay to Clowee |
|--------------|------------|--------------|-----------|------------|---------------|
| Machine 1    | 1,000      | ৳10,000     | 50        | ৳2,500     | ৳4,200       |
| Machine 2    | 800        | ৳8,000      | 40        | ৳2,000     | ৳3,400       |
| **TOTAL**    | **1,800**  | **৳18,000** | **90**    | **৳4,500** | **৳7,600**   |

#### Consolidated Summary
- Net profit calculation across all machines
- Franchise profit share
- Clowee profit share
- Maintenance charges (if applicable)
- Final pay to Clowee amount

#### Payment Information
- Total amount due
- Payment status (Paid/Partial/Due)
- Bank details for payment
- Due date information

### 5. Implementation Components

#### New Components Created
- `FranchiseInvoicePrint.tsx` - Main consolidated invoice component
- Franchise selection UI in Sales page
- Date range selector for periods
- Machine preview list

#### Enhanced Sales Page Features
- "Generate Franchise Invoice" button
- Franchise filter dropdown
- Period selection (half-month/full-month)
- Machine inclusion preview
- Consolidated invoice preview and print

### 6. Usage Workflow

1. **Navigate to Sales Page**
2. **Select "Generate Franchise Invoice"**
3. **Choose Franchise** from dropdown
4. **Select Period** (half-month or full-month)
5. **Preview Machines** included in the period
6. **Generate Invoice** - shows consolidated preview
7. **Print/Download** the consolidated invoice

### 7. Business Benefits

#### For Franchises
- **Simplified Billing**: Single invoice instead of multiple machine invoices
- **Easier Payment**: One payment for all machines
- **Better Financial Tracking**: Consolidated view of all machine performance
- **Reduced Paperwork**: Less invoice management

#### For Clowee
- **Streamlined Process**: Easier invoice generation and tracking
- **Better Franchise Relations**: More professional billing approach
- **Improved Cash Flow**: Simplified payment collection
- **Reduced Administrative Work**: Less individual invoice management

### 8. Technical Features

#### Data Aggregation
- Groups sales by franchise_id and date range
- Sums all machine data within the franchise
- Maintains individual machine breakdown for transparency
- Calculates consolidated profit sharing

#### Print & Export Options
- **Print Invoice**: Direct printing with optimized layout
- **Download PDF**: High-quality PDF generation
- **Download JPG**: Image format for easy sharing
- **Standard A4 Format**: Professional invoice layout

#### Payment Integration
- Links with existing payment tracking system
- Shows consolidated payment status
- Tracks payments against consolidated invoices
- Maintains payment history per franchise

### 9. Configuration Options

#### Franchise Settings
- Payment duration (Half Monthly/Monthly)
- Profit sharing percentages
- Bank account details
- Invoice preferences

#### Period Management
- Half-month periods: 1-15 and 16-end of month
- Full-month periods: 1st to last day of month
- Automatic period detection based on franchise settings
- Custom date range selection

### 10. Future Enhancements

#### Potential Improvements
- **Email Integration**: Auto-send invoices to franchise email
- **Payment Reminders**: Automated payment reminder system
- **Invoice Templates**: Multiple invoice template options
- **Bulk Generation**: Generate invoices for multiple franchises at once
- **Analytics Dashboard**: Franchise-wise performance analytics
- **Mobile Optimization**: Mobile-friendly invoice viewing

#### Integration Possibilities
- **Accounting Software**: Export to popular accounting systems
- **Payment Gateway**: Direct payment links in invoices
- **SMS Notifications**: Payment reminders via SMS
- **WhatsApp Integration**: Share invoices via WhatsApp

## Implementation Status
✅ **Completed**: Planning and documentation
✅ **Completed**: Core component development
✅ **Completed**: FranchiseInvoicePrint component
✅ **Completed**: FranchiseInvoiceModal component
✅ **Completed**: Utility functions for calculations
✅ **Completed**: Sales page integration
🔄 **In Progress**: Testing and refinement
⏳ **Pending**: Production deployment

## Support
For technical support or feature requests related to franchise-wise invoicing, please contact the development team.