import { Command } from 'commander';
import { businessClientCommand } from './client';
import { businessProjectCommand } from './project';
import { businessBillingCommand } from './billing';
import { businessReportCommand } from './report';
import { businessScheduleCommand } from './schedule';
import { businessBackupCommand } from './backup';

export function businessCommand() {
  const cmd = new Command('business');

  cmd.description('Business automation suite for Bobby\'s Tech Services');

  // Add subcommands
  cmd.addCommand(businessClientCommand());
  cmd.addCommand(businessProjectCommand());
  cmd.addCommand(businessBillingCommand());
  cmd.addCommand(businessReportCommand());
  cmd.addCommand(businessScheduleCommand());
  cmd.addCommand(businessBackupCommand());

  return cmd;
}