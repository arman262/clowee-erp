# Notifications System Implementation

## Overview
A comprehensive notification system has been added to the Settings page that tracks and displays all system activities in real-time.

## Database Schema

### Table: `notifications`
```sql
- id: UUID (Primary Key)
- notification_type: VARCHAR(50) - Type of notification (Success, Error, Warning, Info)
- message: TEXT - Notification message
- related_module: VARCHAR(50) - Module where the action occurred
- user_id: UUID - Foreign key to users table (nullable)
- status: VARCHAR(20) - 'read' or 'unread'
- created_at: TIMESTAMP - Auto-generated timestamp
```

### Indexes
- `idx_notifications_status` - Fast filtering by status
- `idx_notifications_created_at` - Ordered by date (DESC)
- `idx_notifications_user_id` - Fast user lookup

## Features

### 1. Notifications Table
- **Columns**: #, Type, Message, Module, User, Date & Time, Status, Actions
- **Pagination**: 10 rows per page (configurable)
- **Color-coded Types**:
  - Success: Green badge
  - Error: Red badge
  - Warning: Yellow badge
  - Info: Blue badge
- **Status Badges**: Unread (highlighted) / Read
- **Unread Counter**: Badge showing total unread notifications

### 2. Actions
- **Mark as Read**: Check button for unread notifications
- **Delete**: Remove notification from system

### 3. Real-time Updates
Notifications are automatically created when:
- **Users**: Create, Update, Delete user accounts
- **Franchises**: Create, Update, Delete franchises
- **Machines**: Create, Update, Delete machines
- **Sales**: Create, Update, Delete sales records
- **Payments**: Create, Update, Delete payment records
- **Expenses**: Create, Update, Delete expenses
- **Counter Readings**: Create, Update, Delete readings

## Integration Points

### Hooks with Notifications
1. `useUsers.ts` - User management notifications
2. `useFranchises.ts` - Franchise operations
3. `useMachines.ts` - Machine operations
4. `useSales.ts` - Sales tracking
5. `useMachinePayments.ts` - Payment tracking
6. `useMachineExpenses.ts` - Expense tracking
7. `useMachineCounters.ts` - Counter reading tracking

### Helper Hook
`useNotificationMutations.ts` provides:
- `notifyCreate(module, entity)` - Success notification
- `notifyUpdate(module, entity)` - Info notification
- `notifyDelete(module, entity)` - Warning notification
- `notifyError(module, message)` - Error notification

## Usage Example

```typescript
import { useNotificationMutations } from '@/hooks/useNotificationMutations';

const { notifyCreate } = useNotificationMutations();

// After successful operation
await createSomething(data);
notifyCreate('Sales', 'record');
// Creates: "New record created in Sales"
```

## UI Location
**Settings Page** → **System Notifications Section**
- Located below User Management section
- Full-width card with Bell icon
- Shows unread count in header badge

## Notification Types

| Type | Color | Use Case |
|------|-------|----------|
| Success | Green | Create operations, successful completions |
| Info | Blue | Update operations, informational messages |
| Warning | Yellow | Delete operations, alerts |
| Error | Red | Failed operations, system errors |

## Benefits
1. **Audit Trail**: Complete history of system activities
2. **User Accountability**: Track which user performed each action
3. **Real-time Monitoring**: Instant visibility of system events
4. **Module Tracking**: Know which part of the system was affected
5. **Status Management**: Mark notifications as read/unread
6. **Easy Cleanup**: Delete old or irrelevant notifications

## Future Enhancements
- Push notifications for critical events
- Email notifications for admins
- Notification preferences per user
- Bulk mark as read/delete
- Advanced filtering by module, type, date range
- Export notification logs
