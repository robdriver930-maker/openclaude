import { Command } from 'commander';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';

// Schedule item structure
interface ScheduledItem {
  id: string;
  title: string;
  description?: string;
  type: 'follow-up' | 'meeting' | 'task' | 'reminder';
  associatedId?: string; // ID of project, client, or invoice this relates to
  scheduledDate: Date;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// In-memory storage for scheduled items
let scheduledItems: ScheduledItem[] = [];

export function businessScheduleCommand() {
  const cmd = new Command('schedule');

  cmd.description('Business workflow automation and scheduling tools');

  cmd.command('list')
    .description('List all scheduled items')
    .option('--type <type>', 'Filter by type (follow-up, meeting, task, reminder)')
    .option('--completed', 'Show completed items')
    .action(async (options) => {
      try {
        await loadScheduledItems();
        if (scheduledItems.length === 0) {
          console.log('No scheduled items found.');
          return;
        }

        let filteredItems = scheduledItems;
        if (options.type) {
          filteredItems = scheduledItems.filter(i => i.type === options.type);
        }

        if (!options.completed) {
          filteredItems = filteredItems.filter(i => !i.completed);
        }

        console.log('Scheduled Items:');
        console.log('-'.repeat(80));
        for (const item of filteredItems) {
          const status = item.completed ? '[COMPLETED]' : '[PENDING]';
          console.log(`ID: ${item.id}`);
          console.log(`${status} ${item.title}`);
          console.log(`Type: ${item.type}`);
          console.log(`Scheduled Date: ${item.scheduledDate.toISOString().split('T')[0]}`);
          if (item.associatedId) console.log(`Associated ID: ${item.associatedId}`);
          if (item.description) console.log(`Description: ${item.description}`);
          console.log('-'.repeat(40));
        }
      } catch (error) {
        console.error('Error listing scheduled items:', error);
      }
    });

  cmd.command('add')
    .description('Add a new scheduled item')
    .option('--title <title>', 'Item title')
    .option('--type <type>', 'Item type (follow-up, meeting, task, reminder)')
    .option('--associated-id <id>', 'Associated project/client/invoice ID')
    .option('--date <date>', 'Scheduled date (YYYY-MM-DD)')
    .option('--description <description>', 'Description')
    .action(async (options) => {
      try {
        // Validate required fields
        if (!options.title || !options.type) {
          console.error('Error: Title and type are required');
          return;
        }

        // Validate date format
        let scheduledDate: Date;

        if (options.date) {
          scheduledDate = new Date(options.date);
          if (isNaN(scheduledDate.getTime())) {
            console.error('Error: Invalid date format. Use YYYY-MM-DD');
            return;
          }
        } else {
          scheduledDate = new Date();
        }

        // Generate unique ID
        const id = generateId();

        const newItem: ScheduledItem = {
          id,
          title: options.title,
          description: options.description,
          type: options.type as any,
          associatedId: options.associatedId,
          scheduledDate,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        scheduledItems.push(newItem);
        await saveScheduledItems();

        console.log(`Scheduled item added successfully with ID: ${id}`);
        console.log(`Title: ${newItem.title}`);
        console.log(`Type: ${newItem.type}`);
        console.log(`Date: ${newItem.scheduledDate.toISOString().split('T')[0]}`);
        if (newItem.associatedId) console.log(`Associated ID: ${newItem.associatedId}`);
      } catch (error) {
        console.error('Error adding scheduled item:', error);
      }
    });

  cmd.command('complete')
    .description('Mark a scheduled item as completed')
    .argument('<id>', 'Item ID')
    .action(async (id) => {
      try {
        await loadScheduledItems();

        const itemIndex = scheduledItems.findIndex(i => i.id === id);
        if (itemIndex === -1) {
          console.error(`Scheduled item with ID ${id} not found`);
          return;
        }

        scheduledItems[itemIndex].completed = true;
        scheduledItems[itemIndex].updatedAt = new Date();
        await saveScheduledItems();

        console.log(`Scheduled item ${id} marked as completed`);
      } catch (error) {
        console.error('Error completing scheduled item:', error);
      }
    });

  cmd.command('update')
    .description('Update a scheduled item')
    .argument('<id>', 'Item ID')
    .option('--title <title>', 'Item title')
    .option('--type <type>', 'Item type (follow-up, meeting, task, reminder)')
    .option('--associated-id <id>', 'Associated project/client/invoice ID')
    .option('--date <date>', 'Scheduled date (YYYY-MM-DD)')
    .option('--description <description>', 'Description')
    .action(async (id, options) => {
      try {
        await loadScheduledItems();

        const itemIndex = scheduledItems.findIndex(i => i.id === id);
        if (itemIndex === -1) {
          console.error(`Scheduled item with ID ${id} not found`);
          return;
        }

        const item = scheduledItems[itemIndex];

        if (options.title) item.title = options.title;
        if (options.type) item.type = options.type as any;
        if (options.associatedId) item.associatedId = options.associatedId;
        if (options.description) item.description = options.description;

        // Update date if provided
        if (options.date) {
          const scheduledDate = new Date(options.date);
          if (isNaN(scheduledDate.getTime())) {
            console.error('Error: Invalid date format. Use YYYY-MM-DD');
            return;
          }
          item.scheduledDate = scheduledDate;
        }

        item.updatedAt = new Date();
        scheduledItems[itemIndex] = item;
        await saveScheduledItems();

        console.log(`Scheduled item ${id} updated successfully`);
      } catch (error) {
        console.error('Error updating scheduled item:', error);
      }
    });

  cmd.command('delete')
    .description('Delete a scheduled item')
    .argument('<id>', 'Item ID')
    .action(async (id) => {
      try {
        await loadScheduledItems();

        const itemIndex = scheduledItems.findIndex(i => i.id === id);
        if (itemIndex === -1) {
          console.error(`Scheduled item with ID ${id} not found`);
          return;
        }

        // Remove the item
        scheduledItems.splice(itemIndex, 1);
        await saveScheduledItems();

        console.log(`Scheduled item ${id} deleted successfully`);
      } catch (error) {
        console.error('Error deleting scheduled item:', error);
      }
    });

  cmd.command('follow-up')
    .description('Create a follow-up reminder for a project or client')
    .option('--title <title>', 'Follow-up title')
    .option('--client-id <id>', 'Client ID')
    .option('--project-id <id>', 'Project ID')
    .option('--days <days>', 'Days from now to schedule the follow-up')
    .option('--description <description>', 'Description')
    .action(async (options) => {
      try {
        if (!options.title) {
          console.error('Error: Title is required for follow-ups');
          return;
        }

        // Calculate scheduled date
        const daysFromNow = parseInt(options.days) || 1;
        const scheduledDate = new Date();
        scheduledDate.setDate(scheduledDate.getDate() + daysFromNow);

        // Determine associated ID from project or client if provided
        let associatedId: string | undefined;
        if (options.projectId) {
          associatedId = options.projectId;
        } else if (options.clientId) {
          associatedId = options.clientId;
        }

        const newItem: ScheduledItem = {
          id: generateId(),
          title: options.title,
          description: options.description,
          type: 'follow-up',
          associatedId,
          scheduledDate,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        scheduledItems.push(newItem);
        await saveScheduledItems();

        console.log(`Follow-up reminder created successfully`);
        console.log(`Title: ${newItem.title}`);
        console.log(`Scheduled for: ${newItem.scheduledDate.toISOString().split('T')[0]}`);
        if (associatedId) console.log(`Associated with: ${associatedId}`);
      } catch (error) {
        console.error('Error creating follow-up:', error);
      }
    });

  return cmd;
}

// Helper functions
async function loadScheduledItems(): Promise<void> {
  try {
    const data = await readFile('business-schedule.json', 'utf8');
    scheduledItems = JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, start with empty array
    if (!existsSync('business-schedule.json')) {
      scheduledItems = [];
      return;
    }
    throw error;
  }
}

async function saveScheduledItems(): Promise<void> {
  await writeFile('business-schedule.json', JSON.stringify(scheduledItems, null, 2));
}

function generateId(): string {
  return 'sched_' + Math.random().toString(36).substring(2, 15);
}