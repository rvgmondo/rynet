import * as migration_20260825_073448_initial from './20260825_073448_initial';
import * as migration_20260903_040804_trade_in_leads from './20260903_040804_trade_in_leads';

export const migrations = [
  {
    up: migration_20260825_073448_initial.up,
    down: migration_20260825_073448_initial.down,
    name: '20260825_073448_initial',
  },
  {
    up: migration_20260903_040804_trade_in_leads.up,
    down: migration_20260903_040804_trade_in_leads.down,
    name: '20260903_040804_trade_in_leads'
  },
];
