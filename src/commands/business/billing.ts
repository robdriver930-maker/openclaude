import { Command } from 'commander';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';

// Invoice data structure
interface BusinessInvoice {
  id: string;
  projectId: string; // ID of the project this invoice is for
  clientId: string; // ID of the client this invoice is for
  amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  issueDate: Date;
  dueDate?: Date;
  description?: string;
  notes?: string;
  items?: InvoiceItem[];
  createdAt: Date;
  updatedAt: Date;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number; // quantity * unitPrice
}

// In-memory storage for invoices
let invoices: BusinessInvoice[] = [];

export function businessBillingCommand() {
  const cmd = new Command('billing');

  cmd.description('Manage business billing and invoices');

  cmd.command('list')
    .description('List all invoices')
    .option('--status <status>', 'Filter by status (pending, paid, overdue, cancelled)')
    .action(async (options) => {
      try {
        await loadInvoices();
        if (invoices.length === 0) {
          console.log('No invoices found.');
          return;
        }

        let filteredInvoices = invoices;
        if (options.status) {
          filteredInvoices = invoices.filter(i => i.status === options.status);
        }

        console.log('Invoice List:');
        console.log('-'.repeat(80));
        for (const invoice of filteredInvoices) {
          console.log(`ID: ${invoice.id}`);
          console.log(`Project ID: ${invoice.projectId}`);
          console.log(`Client ID: ${invoice.clientId}`);
          console.log(`Amount: $${invoice.amount.toFixed(2)}`);
          console.log(`Status: ${invoice.status}`);
          console.log(`Issue Date: ${invoice.issueDate.toISOString().split('T')[0]}`);
          if (invoice.dueDate) console.log(`Due Date: ${invoice.dueDate.toISOString().split('T')[0]}`);
          console.log('-'.repeat(40));
        }
      } catch (error) {
        console.error('Error listing invoices:', error);
      }
    });

  cmd.command('add')
    .description('Add a new invoice')
    .option('--project-id <id>', 'Project ID')
    .option('--client-id <id>', 'Client ID')
    .option('--amount <amount>', 'Invoice amount')
    .option('--status <status>', 'Invoice status')
    .option('--issue-date <date>', 'Issue date (YYYY-MM-DD)')
    .option('--due-date <date>', 'Due date (YYYY-MM-DD)')
    .option('--description <description>', 'Description')
    .option('--notes <notes>', 'Notes')
    .action(async (options) => {
      try {
        // Validate required fields
        if (!options.projectId || !options.clientId || !options.amount) {
          console.error('Error: Project ID, Client ID, and amount are required');
          return;
        }

        // Set default status if not provided
        const status = options.status || 'pending';

        // Parse dates if provided
        let issueDate: Date;
        let dueDate: Date | undefined;

        if (options.issueDate) {
          issueDate = new Date(options.issueDate);
          if (isNaN(issueDate.getTime())) {
            console.error('Error: Invalid issue date format');
            return;
          }
        } else {
          issueDate = new Date();
        }

        if (options.dueDate) {
          dueDate = new Date(options.dueDate);
          if (isNaN(dueDate.getTime())) {
            console.error('Error: Invalid due date format');
            return;
          }
        }

        // Generate unique ID
        const id = generateId();

        const newInvoice: BusinessInvoice = {
          id,
          projectId: options.projectId,
          clientId: options.clientId,
          amount: parseFloat(options.amount),
          status,
          issueDate,
          dueDate,
          description: options.description,
          notes: options.notes,
          items: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        invoices.push(newInvoice);
        await saveInvoices();

        console.log(`Invoice added successfully with ID: ${id}`);
        console.log(`Project ID: ${newInvoice.projectId}`);
        console.log(`Client ID: ${newInvoice.clientId}`);
        console.log(`Amount: $${newInvoice.amount.toFixed(2)}`);
        console.log(`Status: ${newInvoice.status}`);
      } catch (error) {
        console.error('Error adding invoice:', error);
      }
    });

  cmd.command('view')
    .description('View a specific invoice')
    .argument('<id>', 'Invoice ID')
    .action(async (id) => {
      try {
        await loadInvoices();

        const invoice = invoices.find(i => i.id === id);
        if (!invoice) {
          console.error(`Invoice with ID ${id} not found`);
          return;
        }

        console.log('Invoice Details:');
        console.log('-'.repeat(40));
        console.log(`ID: ${invoice.id}`);
        console.log(`Project ID: ${invoice.projectId}`);
        console.log(`Client ID: ${invoice.clientId}`);
        console.log(`Amount: $${invoice.amount.toFixed(2)}`);
        console.log(`Status: ${invoice.status}`);
        console.log(`Issue Date: ${invoice.issueDate.toISOString().split('T')[0]}`);
        if (invoice.dueDate) console.log(`Due Date: ${invoice.dueDate.toISOString().split('T')[0]}`);
        if (invoice.description) console.log(`Description: ${invoice.description}`);
        if (invoice.notes) console.log(`Notes: ${invoice.notes}`);
        console.log(`Created: ${invoice.createdAt.toISOString()}`);
        console.log(`Updated: ${invoice.updatedAt.toISOString()}`);

        if (invoice.items && invoice.items.length > 0) {
          console.log('\nInvoice Items:');
          console.log('-'.repeat(40));
          for (const item of invoice.items) {
            console.log(`${item.description}: ${item.quantity} x $${item.unitPrice.toFixed(2)} = $${item.total.toFixed(2)}`);
          }
        }
      } catch (error) {
        console.error('Error viewing invoice:', error);
      }
    });

  cmd.command('update')
    .description('Update an invoice')
    .argument('<id>', 'Invoice ID')
    .option('--project-id <id>', 'Project ID')
    .option('--client-id <id>', 'Client ID')
    .option('--amount <amount>', 'Invoice amount')
    .option('--status <status>', 'Invoice status')
    .option('--issue-date <date>', 'Issue date (YYYY-MM-DD)')
    .option('--due-date <date>', 'Due date (YYYY-MM-DD)')
    .option('--description <description>', 'Description')
    .option('--notes <notes>', 'Notes')
    .action(async (id, options) => {
      try {
        await loadInvoices();

        const invoiceIndex = invoices.findIndex(i => i.id === id);
        if (invoiceIndex === -1) {
          console.error(`Invoice with ID ${id} not found`);
          return;
        }

        const invoice = invoices[invoiceIndex];

        if (options.projectId) invoice.projectId = options.projectId;
        if (options.clientId) invoice.clientId = options.clientId;
        if (options.amount) invoice.amount = parseFloat(options.amount);
        if (options.status) invoice.status = options.status as any;
        if (options.description) invoice.description = options.description;
        if (options.notes) invoice.notes = options.notes;

        // Parse dates if provided
        if (options.issueDate) {
          const issueDate = new Date(options.issueDate);
          if (isNaN(issueDate.getTime())) {
            console.error('Error: Invalid issue date format');
            return;
          }
          invoice.issueDate = issueDate;
        }

        if (options.dueDate) {
          const dueDate = new Date(options.dueDate);
          if (isNaN(dueDate.getTime())) {
            console.error('Error: Invalid due date format');
            return;
          }
          invoice.dueDate = dueDate;
        }

        invoice.updatedAt = new Date();
        invoices[invoiceIndex] = invoice;
        await saveInvoices();

        console.log(`Invoice ${id} updated successfully`);
      } catch (error) {
        console.error('Error updating invoice:', error);
      }
    });

  cmd.command('delete')
    .description('Delete an invoice')
    .argument('<id>', 'Invoice ID')
    .action(async (id) => {
      try {
        await loadInvoices();

        const invoiceIndex = invoices.findIndex(i => i.id === id);
        if (invoiceIndex === -1) {
          console.error(`Invoice with ID ${id} not found`);
          return;
        }

        // Remove the invoice
        invoices.splice(invoiceIndex, 1);
        await saveInvoices();

        console.log(`Invoice ${id} deleted successfully`);
      } catch (error) {
        console.error('Error deleting invoice:', error);
      }
    });

  cmd.command('status')
    .description('Update invoice status')
    .argument('<id>', 'Invoice ID')
    .argument('<status>', 'New status (pending, paid, overdue, cancelled)')
    .action(async (id, status) => {
      try {
        await loadInvoices();

        const invoiceIndex = invoices.findIndex(i => i.id === id);
        if (invoiceIndex === -1) {
          console.error(`Invoice with ID ${id} not found`);
          return;
        }

        const validStatuses = ['pending', 'paid', 'overdue', 'cancelled'];
        if (!validStatuses.includes(status)) {
          console.error(`Error: Invalid status. Valid statuses are: ${validStatuses.join(', ')}`);
          return;
        }

        invoices[invoiceIndex].status = status as any;
        invoices[invoiceIndex].updatedAt = new Date();

        await saveInvoices();

        console.log(`Invoice ${id} status updated to ${status}`);
      } catch (error) {
        console.error('Error updating invoice status:', error);
      }
    });

  return cmd;
}

// Helper functions
async function loadInvoices(): Promise<void> {
  try {
    const data = await readFile('business-invoices.json', 'utf8');
    invoices = JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, start with empty array
    if (!existsSync('business-invoices.json')) {
      invoices = [];
      return;
    }
    throw error;
  }
}

async function saveInvoices(): Promise<void> {
  await writeFile('business-invoices.json', JSON.stringify(invoices, null, 2));
}

function generateId(): string {
  return 'inv_' + Math.random().toString(36).substring(2, 15);
}