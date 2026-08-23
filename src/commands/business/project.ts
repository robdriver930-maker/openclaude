import { Command } from 'commander';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';

// Project data structure
interface BusinessProject {
  id: string;
  name: string;
  clientId: string; // ID of the client this project belongs to
  description?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'on-hold';
  startDate?: Date;
  endDate?: Date;
  budget?: number;
  actualCost?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// In-memory storage for projects
let projects: BusinessProject[] = [];

export function businessProjectCommand() {
  const cmd = new Command('project');

  cmd.description('Manage business projects');

  cmd.command('list')
    .description('List all projects')
    .option('--status <status>', 'Filter by status (pending, in-progress, completed, on-hold)')
    .action(async (options) => {
      try {
        await loadProjects();
        if (projects.length === 0) {
          console.log('No projects found.');
          return;
        }

        let filteredProjects = projects;
        if (options.status) {
          filteredProjects = projects.filter(p => p.status === options.status);
        }

        console.log('Project List:');
        console.log('-'.repeat(80));
        for (const project of filteredProjects) {
          console.log(`ID: ${project.id}`);
          console.log(`Name: ${project.name}`);
          console.log(`Status: ${project.status}`);
          console.log(`Client ID: ${project.clientId}`);
          if (project.startDate) console.log(`Start Date: ${project.startDate.toISOString().split('T')[0]}`);
          if (project.endDate) console.log(`End Date: ${project.endDate.toISOString().split('T')[0]}`);
          if (project.budget) console.log(`Budget: $${project.budget.toFixed(2)}`);
          console.log('-'.repeat(40));
        }
      } catch (error) {
        console.error('Error listing projects:', error);
      }
    });

  cmd.command('add')
    .description('Add a new project')
    .option('--name <name>', 'Project name')
    .option('--client-id <id>', 'Client ID')
    .option('--description <description>', 'Project description')
    .option('--status <status>', 'Project status')
    .option('--start-date <date>', 'Start date (YYYY-MM-DD)')
    .option('--end-date <date>', 'End date (YYYY-MM-DD)')
    .option('--budget <amount>', 'Budget amount')
    .option('--notes <notes>', 'Notes')
    .action(async (options) => {
      try {
        // Validate required fields
        if (!options.name || !options.clientId) {
          console.error('Error: Name and client ID are required');
          return;
        }

        // Set default status if not provided
        const status = options.status || 'pending';

        // Parse dates if provided
        let startDate: Date | undefined;
        let endDate: Date | undefined;

        if (options.startDate) {
          startDate = new Date(options.startDate);
          if (isNaN(startDate.getTime())) {
            console.error('Error: Invalid start date format');
            return;
          }
        }

        if (options.endDate) {
          endDate = new Date(options.endDate);
          if (isNaN(endDate.getTime())) {
            console.error('Error: Invalid end date format');
            return;
          }
        }

        // Generate unique ID
        const id = generateId();

        const newProject: BusinessProject = {
          id,
          name: options.name,
          clientId: options.clientId,
          description: options.description,
          status,
          startDate,
          endDate,
          budget: options.budget ? parseFloat(options.budget) : undefined,
          actualCost: 0,
          notes: options.notes,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        projects.push(newProject);
        await saveProjects();

        console.log(`Project added successfully with ID: ${id}`);
        console.log(`Name: ${newProject.name}`);
        console.log(`Client ID: ${newProject.clientId}`);
        console.log(`Status: ${newProject.status}`);
      } catch (error) {
        console.error('Error adding project:', error);
      }
    });

  cmd.command('view')
    .description('View a specific project')
    .argument('<id>', 'Project ID')
    .action(async (id) => {
      try {
        await loadProjects();

        const project = projects.find(p => p.id === id);
        if (!project) {
          console.error(`Project with ID ${id} not found`);
          return;
        }

        console.log('Project Details:');
        console.log('-'.repeat(40));
        console.log(`ID: ${project.id}`);
        console.log(`Name: ${project.name}`);
        console.log(`Client ID: ${project.clientId}`);
        console.log(`Status: ${project.status}`);
        if (project.description) console.log(`Description: ${project.description}`);
        if (project.startDate) console.log(`Start Date: ${project.startDate.toISOString().split('T')[0]}`);
        if (project.endDate) console.log(`End Date: ${project.endDate.toISOString().split('T')[0]}`);
        if (project.budget) console.log(`Budget: $${project.budget.toFixed(2)}`);
        if (project.actualCost) console.log(`Actual Cost: $${project.actualCost.toFixed(2)}`);
        if (project.notes) console.log(`Notes: ${project.notes}`);
        console.log(`Created: ${project.createdAt.toISOString()}`);
        console.log(`Updated: ${project.updatedAt.toISOString()}`);
      } catch (error) {
        console.error('Error viewing project:', error);
      }
    });

  cmd.command('update')
    .description('Update a project')
    .argument('<id>', 'Project ID')
    .option('--name <name>', 'Project name')
    .option('--client-id <id>', 'Client ID')
    .option('--description <description>', 'Project description')
    .option('--status <status>', 'Project status')
    .option('--start-date <date>', 'Start date (YYYY-MM-DD)')
    .option('--end-date <date>', 'End date (YYYY-MM-DD)')
    .option('--budget <amount>', 'Budget amount')
    .option('--notes <notes>', 'Notes')
    .action(async (id, options) => {
      try {
        await loadProjects();

        const projectIndex = projects.findIndex(p => p.id === id);
        if (projectIndex === -1) {
          console.error(`Project with ID ${id} not found`);
          return;
        }

        const project = projects[projectIndex];

        if (options.name) project.name = options.name;
        if (options.clientId) project.clientId = options.clientId;
        if (options.description) project.description = options.description;
        if (options.status) project.status = options.status as any;
        if (options.budget) project.budget = parseFloat(options.budget);
        if (options.notes) project.notes = options.notes;

        // Parse dates if provided
        if (options.startDate) {
          const startDate = new Date(options.startDate);
          if (isNaN(startDate.getTime())) {
            console.error('Error: Invalid start date format');
            return;
          }
          project.startDate = startDate;
        }

        if (options.endDate) {
          const endDate = new Date(options.endDate);
          if (isNaN(endDate.getTime())) {
            console.error('Error: Invalid end date format');
            return;
          }
          project.endDate = endDate;
        }

        project.updatedAt = new Date();
        projects[projectIndex] = project;
        await saveProjects();

        console.log(`Project ${id} updated successfully`);
      } catch (error) {
        console.error('Error updating project:', error);
      }
    });

  cmd.command('delete')
    .description('Delete a project')
    .argument('<id>', 'Project ID')
    .action(async (id) => {
      try {
        await loadProjects();

        const projectIndex = projects.findIndex(p => p.id === id);
        if (projectIndex === -1) {
          console.error(`Project with ID ${id} not found`);
          return;
        }

        // Remove the project
        projects.splice(projectIndex, 1);
        await saveProjects();

        console.log(`Project ${id} deleted successfully`);
      } catch (error) {
        console.error('Error deleting project:', error);
      }
    });

  return cmd;
}

// Helper functions
async function loadProjects(): Promise<void> {
  try {
    const data = await readFile('business-projects.json', 'utf8');
    projects = JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, start with empty array
    if (!existsSync('business-projects.json')) {
      projects = [];
      return;
    }
    throw error;
  }
}

async function saveProjects(): Promise<void> {
  await writeFile('business-projects.json', JSON.stringify(projects, null, 2));
}

function generateId(): string {
  return 'proj_' + Math.random().toString(36).substring(2, 15);
}