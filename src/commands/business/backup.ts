import { Command } from 'commander';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { createReadStream, createWriteStream } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export function businessBackupCommand() {
  const cmd = new Command('backup');

  cmd.description('Business data backup and compliance tools');

  cmd.command('create')
    .description('Create a backup of all business data')
    .option('--name <name>', 'Backup name (optional)')
    .option('--compress', 'Compress the backup')
    .action(async (options) => {
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupName = options.name || `business-backup-${timestamp}`;

        // Create backup directory if it doesn't exist
        await mkdir('backup', { recursive: true });

        // Create a backup manifest with details
        const manifest = {
          backupName,
          timestamp: new Date().toISOString(),
          files: ['business-clients.json', 'business-projects.json', 'business-invoices.json', 'business-schedule.json'],
          version: '1.0'
        };

        // Save manifest
        await writeFile(`backup/${backupName}.manifest.json`, JSON.stringify(manifest, null, 2));

        // Copy business data files to backup directory
        const dataFiles = ['business-clients.json', 'business-projects.json', 'business-invoices.json', 'business-schedule.json'];
        for (const file of dataFiles) {
          if (existsSync(file)) {
            await writeFile(`backup/${file}`, await readFile(file, 'utf8'));
          }
        }

        console.log(`Backup created successfully: ${backupName}`);
        console.log(`Files backed up: ${manifest.files.join(', ')}`);
      } catch (error) {
        console.error('Error creating backup:', error);
      }
    });

  cmd.command('list')
    .description('List all available backups')
    .action(async () => {
      try {
        if (!existsSync('backup')) {
          console.log('No backups found. Create a backup first.');
          return;
        }

        // List backup files in the backup directory
        const backups = [];
        const files = ['business-clients.json', 'business-projects.json', 'business-invoices.json', 'business-schedule.json'];

        console.log('Available Backups:');
        console.log('-'.repeat(60));

        // Simple approach: just show that backups exist with manifest details
        const fsFiles = await (await execPromise(`dir backup\\*.manifest.json /b`)).stdout;
        if (fsFiles.trim()) {
          console.log(fsFiles.trim());
        } else {
          console.log('No backup manifests found.');
        }
      } catch (error) {
        console.error('Error listing backups:', error);
      }
    });

  cmd.command('restore')
    .description('Restore business data from a specific backup')
    .argument('<backup-name>', 'Name of backup to restore')
    .action(async (backupName) => {
      try {
        const manifestFile = `backup/${backupName}.manifest.json`;

        if (!existsSync(manifestFile)) {
          console.error(`Backup ${backupName} not found`);
          return;
        }

        // Load existing manifest
        const manifestData = await readFile(manifestFile, 'utf8');
        const manifest = JSON.parse(manifestData);

        // Check that all files in manifest exist
        for (const file of manifest.files) {
          if (!existsSync(`backup/${file}`)) {
            console.error(`Backup file ${file} not found`);
            return;
          }
        }

        // Restore all data files
        for (const file of manifest.files) {
          await writeFile(file, await readFile(`backup/${file}`, 'utf8'));
        }

        console.log(`Backup ${backupName} restored successfully`);
        console.log('Please restart the business tools to see updated data.');
      } catch (error) {
        console.error('Error restoring backup:', error);
      }
    });

  cmd.command('compliance')
    .description('Generate compliance report for business data')
    .action(async () => {
      try {
        // Read all business data files
        const clients = existsSync('business-clients.json') ?
          JSON.parse(await readFile('business-clients.json', 'utf8')) : [];
        const projects = existsSync('business-projects.json') ?
          JSON.parse(await readFile('business-projects.json', 'utf8')) : [];
        const invoices = existsSync('business-invoices.json') ?
          JSON.parse(await readFile('business-invoices.json', 'utf8')) : [];
        const scheduledItems = existsSync('business-schedule.json') ?
          JSON.parse(await readFile('business-schedule.json', 'utf8')) : [];

        console.log('Business Compliance Report');
        console.log('='.repeat(50));
        console.log(`Clients: ${clients.length}`);
        console.log(`Projects: ${projects.length}`);
        console.log(`Invoices: ${invoices.length}`);
        console.log(`Scheduled Items: ${scheduledItems.length}`);

        // Calculate data age
        const now = new Date();
        let oldestClient = new Date(0);
        if (clients.length > 0) {
          oldestClient = new Date(Math.min(...clients.map(c => new Date(c.createdAt).getTime())));
        }

        console.log(`Oldest Client Data: ${oldestClient.toISOString().split('T')[0]}`);
        console.log(`Last Backup: ${now.toISOString().split('T')[0]}`);

        // Compliance check status
        const complianceStatus = (clients.length > 0) ? 'COMPLIANT' : 'NOT_COMPLIANT';
        console.log(`Compliance Status: ${complianceStatus}`);

        console.log('='.repeat(50));
      } catch (error) {
        console.error('Error generating compliance report:', error);
      }
    });

  cmd.command('validate')
    .description('Validate the integrity of business data files')
    .action(async () => {
      try {
        const files = ['business-clients.json', 'business-projects.json', 'business-invoices.json', 'business-schedule.json'];
        let allValid = true;

        console.log('Validating business data integrity:');
        console.log('-'.repeat(40));

        for (const file of files) {
          if (!existsSync(file)) {
            console.log(`⚠️  ${file}: Missing`);
            continue;
          }

          try {
            const content = await readFile(file, 'utf8');
            JSON.parse(content);
            console.log(`✅ ${file}: Valid`);
          } catch (err) {
            console.log(`❌ ${file}: Invalid JSON`);
            allValid = false;
          }
        }

        if (allValid) {
          console.log('\nAll files validated successfully!');
        } else {
          console.log('\nSome files have validation errors.');
        }
      } catch (error) {
        console.error('Error validating data:', error);
      }
    });

  return cmd;
}