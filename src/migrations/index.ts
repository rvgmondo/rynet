import * as migration_20260825_073448_initial from './20260825_073448_initial';
import * as migration_20260903_040804_trade_in_leads from './20260903_040804_trade_in_leads';
import * as migration_20260908_121058_two_factor from './20260908_121058_two_factor';

export const migrations = [
  {
    up: migration_20260825_073448_initial.up,
    down: migration_20260825_073448_initial.down,
    name: '20260825_073448_initial',
  },
  {
    up: migration_20260903_040804_trade_in_leads.up,
    down: migration_20260903_040804_trade_in_leads.down,
    name: '20260903_040804_trade_in_leads',
  },
  {
    up: migration_20260908_121058_two_factor.up,
    down: migration_20260908_121058_two_factor.down,
    name: '20260908_121058_two_factor'
  },
];
