import { Command } from 'commander';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';

// Client data structure
interface BusinessClient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  address?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  projects: string[]; // project IDs
}

// In-memory storage for clients (in a real app, this would be database-backed)
let clients: BusinessClient[] = [];

export function businessClientCommand() {
  const cmd = new Command('client');

  cmd.description('Manage business clients and contacts');

  cmd.command('list')
    .description('List all clients')
    .action(async () => {
      try {
        await loadClients();
        if (clients.length === 0) {
          console.log('No clients found.');
          return;
        }

        console.log('Client List:');
        console.log('-'.repeat(80));
        for (const client of clients) {
          console.log(`ID: ${client.id}`);
          console.log(`Name: ${client.name}`);
          console.log(`Email: ${client.email}`);
          if (client.phone) console.log(`Phone: ${client.phone}`);
          if (client.company) console.log(`Company: ${client.company}`);
          console.log(`Projects: ${client.projects.length}`);
          console.log('-'.repeat(40));
        }
      } catch (error) {
        console.error('Error listing clients:', error);
      }
    });

  cmd.command('add')
    .description('Add a new client')
    .option('--name <name>', 'Client name')
    .option('--email <email>', 'Client email')
    .option('--phone <phone>', 'Client phone')
    .option('--company <company>', 'Company name')
    .option('--address <address>', 'Address')
    .option('--notes <notes>', 'Notes')
    .action(async (options) => {
      try {
        // Validate required fields
        if (!options.name || !options.email) {
          console.error('Error: Name and email are required');
          return;
        }

        // Generate unique ID
        const id = generateId();

        const newClient: BusinessClient = {
          id,
          name: options.name,
          email: options.email,
          phone: options.phone,
          company: options.company,
          address: options.address,
          notes: options.notes,
          createdAt: new Date(),
          updatedAt: new Date(),
          projects: []
        };

        clients.push(newClient);
        await saveClients();

        console.log(`Client added successfully with ID: ${id}`);
        console.log(`Name: ${newClient.name}`);
        console.log(`Email: ${newClient.email}`);
        if (newClient.phone) console.log(`Phone: ${newClient.phone}`);
        if (newClient.company) console.log(`Company: ${newClient.company}`);
      } catch (error) {
        console.error('Error adding client:', error);
      }
    });

  cmd.command('view')
    .description('View a specific client')
    .argument('<id>', 'Client ID')
    .action(async (id) => {
      try {
        await loadClients();

        const client = clients.find(c => c.id === id);
        if (!client) {
          console.error(`Client with ID ${id} not found`);
          return;
        }

        console.log('Client Details:');
        console.log('-'.repeat(40));
        console.log(`ID: ${client.id}`);
        console.log(`Name: ${client.name}`);
        console.log(`Email: ${client.email}`);
        if (client.phone) console.log(`Phone: ${client.phone}`);
        if (client.company) console.log(`Company: ${client.company}`);
        if (client.address) console.log(`Address: ${client.address}`);
        if (client.notes) console.log(`Notes: ${client.notes}`);
        console.log(`Created: ${client.createdAt.toISOString()}`);
        console.log(`Updated: ${client.updatedAt.toISOString()}`);
        console.log(`Projects: ${client.projects.length}`);
      } catch (error) {
        console.error('Error viewing client:', error);
      }
    });

  cmd.command('update')
    .description('Update a client')
    .argument('<id>', 'Client ID')
    .option('--name <name>', 'Client name')
    .option('--email <email>', 'Client email')
    .option('--phone <phone>', 'Client phone')
    .option('--company <company>', 'Company name')
    .option('--address <address>', 'Address')
    .option('--notes <notes>', 'Notes')
    .action(async (id, options) => {
      try {
        await loadClients();

        const clientIndex = clients.findIndex(c => c.id === id);
        if (clientIndex === -1) {
          console.error(`Client with ID ${id} not found`);
          return;
        }

        const client = clients[clientIndex];
        if (options.name) client.name = options.name;
        if (options.email) client.email = options.email;
        if (options.phone) client.phone = options.phone;
        if (options.company) client.company = options.company;
        if (options.address) client.address = options.address;
        if (options.notes) client.notes = options.notes;
        client.updatedAt = new Date();

        clients[clientIndex] = client;
        await saveClients();

        console.log(`Client ${id} updated successfully`);
      } catch (error) {
        console.error('Error updating client:', error);
      }
    });

  cmd.command('delete')
    .description('Delete a client')
    .argument('<id>', 'Client ID')
    .action(async (id) => {
      try {
        await loadClients();

        const clientIndex = clients.findIndex(c => c.id === id);
        if (clientIndex === -1) {
          console.error(`Client with ID ${id} not found`);
          return;
        }

        // Remove the client
        clients.splice(clientIndex, 1);
        await saveClients();

        console.log(`Client ${id} deleted successfully`);
      } catch (error) {
        console.error('Error deleting client:', error);
      }
    });

  return cmd;
}

// Helper functions
async function loadClients(): Promise<void> {
  try {
    const data = await readFile('business-clients.json', 'utf8');
    clients = JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, start with empty array
    if (!existsSync('business-clients.json')) {
      clients = [];
      return;
    }
    throw error;
  }
}

async function saveClients(): Promise<void> {
  await writeFile('business-clients.json', JSON.stringify(clients, null, 2));
}

function generateId(): string {
  return 'client_' + Math.random().toString(36).substring(2, 15);
}