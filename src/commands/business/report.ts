import { Command } from 'commander';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

// Financial summary for reporting
interface BusinessReport {
  totalClients: number;
  totalProjects: number;
  projectsByStatus: Record<string, number>;
  totalRevenue: number;
  revenueByStatus: Record<string, number>;
  activeProjects: number;
  completedProjects: number;
  pendingProjects: number;
  overdueInvoices: number;
  totalInvoices: number;
  monthlyTrend: MonthlyReport[];
}

interface MonthlyReport {
  year: number;
  month: number;
  revenue: number;
  projectsCount: number;
  invoicesCount: number;
}

// In-memory storage for project data (this would be database-backed in production)
let projects: any[] = [];
let invoices: any[] = [];

export function businessReportCommand() {
  const cmd = new Command('report');

  cmd.description('Generate business reports and analytics');

  cmd.command('dashboard')
    .description('Show business dashboard overview')
    .action(async () => {
      try {
        await loadBusinessData();

        console.log('Business Dashboard Overview');
        console.log('='.repeat(50));
        console.log(`Total Clients: ${projects.length > 0 ? [...new Set(projects.map(p => p.clientId))].length : 0}`);
        console.log(`Total Projects: ${projects.length}`);
        console.log(`Active Projects: ${projects.filter(p => p.status === 'in-progress').length}`);
        console.log(`Completed Projects: ${projects.filter(p => p.status === 'completed').length}`);
        console.log(`Pending Projects: ${projects.filter(p => p.status === 'pending').length}`);

        // Calculate revenue
        const totalRevenue = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
        console.log(`Total Revenue: $${totalRevenue.toFixed(2)}`);

        // Show overdue invoices
        const overdueCount = invoices.filter(invoice => invoice.status === 'overdue').length;
        console.log(`Overdue Invoices: ${overdueCount}`);

        console.log('='.repeat(50));
      } catch (error) {
        console.error('Error generating dashboard:', error);
      }
    });

  cmd.command('financial')
    .description('Show detailed financial report')
    .action(async () => {
      try {
        await loadBusinessData();

        // Prepare financial summary
        const totalClients = projects.length > 0 ? [...new Set(projects.map(p => p.clientId))].length : 0;
        const totalProjects = projects.length;

        // Count projects by status
        const projectsByStatus: Record<string, number> = {};
        projects.forEach(project => {
          projectsByStatus[project.status] = (projectsByStatus[project.status] || 0) + 1;
        });

        // Calculate revenue by status
        const revenueByStatus: Record<string, number> = {};
        invoices.forEach(invoice => {
          revenueByStatus[invoice.status] = (revenueByStatus[invoice.status] || 0) + invoice.amount;
        });

        // Calculate total revenue
        const totalRevenue = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);

        // Count overdue invoices
        const overdueInvoices = invoices.filter(invoice => invoice.status === 'overdue').length;
        const totalInvoices = invoices.length;

        console.log('Financial Report');
        console.log('='.repeat(50));
        console.log(`Total Clients: ${totalClients}`);
        console.log(`Total Projects: ${totalProjects}`);
        console.log(`Total Revenue: $${totalRevenue.toFixed(2)}`);
        console.log(`Overdue Invoices: ${overdueInvoices}`);
        console.log(`Total Invoices: ${totalInvoices}`);

        // Status breakdowns
        console.log('\nProjects by Status:');
        Object.entries(projectsByStatus).forEach(([status, count]) => {
          console.log(`  ${status}: ${count}`);
        });

        console.log('\nRevenue by Invoice Status:');
        Object.entries(revenueByStatus).forEach(([status, amount]) => {
          console.log(`  ${status}: $${amount.toFixed(2)}`);
        });

        console.log('='.repeat(50));

      } catch (error) {
        console.error('Error generating financial report:', error);
      }
    });

  cmd.command('monthly')
    .description('Show monthly business trend report')
    .option('--months <count>', 'Number of months to include (default: 12)', '12')
    .action(async (options) => {
      try {
        await loadBusinessData();

        const monthsCount = parseInt(options.months) || 12;
        const now = new Date();
        const monthlyReport: MonthlyReport[] = [];

        // Generate last N months of data
        for (let i = monthsCount - 1; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const year = date.getFullYear();
          const month = date.getMonth() + 1;

          // Filter invoices for this month
          const monthlyInvoices = invoices.filter(invoice => {
            const invoiceDate = new Date(invoice.issueDate);
            return invoiceDate.getFullYear() === year && invoiceDate.getMonth() + 1 === month;
          });

          // Calculate revenue for the month
          const revenue = monthlyInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);

          // Count projects and invoices
          const projectsCount = projects.filter(p => {
            if (p.startDate) {
              const startDate = new Date(p.startDate);
              return startDate.getFullYear() === year && startDate.getMonth() + 1 === month;
            }
            return false;
          }).length;

          const invoicesCount = monthlyInvoices.length;

          monthlyReport.push({
            year,
            month,
            revenue,
            projectsCount,
            invoicesCount
          });
        }

        console.log(`Monthly Business Trend (Last ${monthsCount} months)`);
        console.log('='.repeat(80));
        console.log('Month'.padEnd(15), 'Revenue'.padEnd(15), 'Projects'.padEnd(15), 'Invoices'.padEnd(15));
        console.log('-'.repeat(80));

        monthlyReport.forEach(month => {
          const monthStr = `${month.year}-${month.month.toString().padStart(2, '0')}`;
          console.log(
            monthStr.padEnd(15),
            `$${month.revenue.toFixed(2).padEnd(15)}`,
            month.projectsCount.toString().padEnd(15),
            month.invoicesCount.toString().padEnd(15)
          );
        });

        console.log('='.repeat(80));

      } catch (error) {
        console.error('Error generating monthly report:', error);
      }
    });

  cmd.command('client-breakdown')
    .description('Show client revenue breakdown')
    .action(async () => {
      try {
        await loadBusinessData();

        // Group invoices by client
        const clientRevenue: Record<string, number> = {};
        const clientProjects: Record<string, number> = {};

        invoices.forEach(invoice => {
          if (!clientRevenue[invoice.clientId]) {
            clientRevenue[invoice.clientId] = 0;
          }
          clientRevenue[invoice.clientId] += invoice.amount;

          // Count how many projects each client has
          if (clientProjects[invoice.clientId]) {
            clientProjects[invoice.clientId]++;
          } else {
            clientProjects[invoice.clientId] = 1;
          }
        });

        console.log('Client Revenue Breakdown');
        console.log('='.repeat(60));
        console.log('Client ID'.padEnd(30), 'Revenue'.padEnd(15), 'Projects');
        console.log('-'.repeat(60));

        Object.entries(clientRevenue).forEach(([clientId, revenue]) => {
          const projectsCount = clientProjects[clientId] || 0;
          console.log(
            clientId.padEnd(30),
            `$${revenue.toFixed(2).padEnd(15)}`,
            projectsCount.toString()
          );
        });

        console.log('='.repeat(60));

      } catch (error) {
        console.error('Error generating client breakdown:', error);
      }
    });

  return cmd;
}

// Helper functions
async function loadBusinessData(): Promise<void> {
  try {
    // Load projects
    if (existsSync('business-projects.json')) {
      const projectsData = await readFile('business-projects.json', 'utf8');
      projects = JSON.parse(projectsData);
    }

    // Load invoices
    if (existsSync('business-invoices.json')) {
      const invoicesData = await readFile('business-invoices.json', 'utf8');
      invoices = JSON.parse(invoicesData);
    }
  } catch (error) {
    console.error('Error loading business data:', error);
    throw error;
  }
}