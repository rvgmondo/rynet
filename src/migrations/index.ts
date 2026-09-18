import * as migration_20260825_073448_initial from './20260825_073448_initial';
import * as migration_20260903_040804_trade_in_leads from './20260903_040804_trade_in_leads';
import * as migration_20260908_121058_two_factor from './20260908_121058_two_factor';
import * as migration_20260909_062425_trade_in_distribution from './20260909_062425_trade_in_distribution';
import * as migration_20260914_081942_media_demonstration_flag from './20260914_081942_media_demonstration_flag';
import * as migration_20260914_081942_media_owner from './20260914_081942_media_owner';
import * as migration_20260914_081943_demo_photographs from './20260914_081943_demo_photographs';
import * as migration_20260914_110000_demo_photo_card_sizes from './20260914_110000_demo_photo_card_sizes';
import * as migration_20260916_120000_vehicle_titles from './20260916_120000_vehicle_titles';
import * as migration_20260916_120100_vehicle_saved_state from './20260916_120100_vehicle_saved_state';

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
    name: '20260908_121058_two_factor',
  },
  {
    up: migration_20260909_062425_trade_in_distribution.up,
    down: migration_20260909_062425_trade_in_distribution.down,
    name: '20260909_062425_trade_in_distribution',
  },
  {
    up: migration_20260914_081942_media_demonstration_flag.up,
    down: migration_20260914_081942_media_demonstration_flag.down,
    name: '20260914_081942_media_demonstration_flag',
  },
  {
    up: migration_20260914_081942_media_owner.up,
    down: migration_20260914_081942_media_owner.down,
    name: '20260914_081942_media_owner',
  },
  {
    up: migration_20260914_081943_demo_photographs.up,
    down: migration_20260914_081943_demo_photographs.down,
    name: '20260914_081943_demo_photographs',
  },
  {
    up: migration_20260914_110000_demo_photo_card_sizes.up,
    down: migration_20260914_110000_demo_photo_card_sizes.down,
    name: '20260914_110000_demo_photo_card_sizes',
  },
  {
    up: migration_20260916_120000_vehicle_titles.up,
    down: migration_20260916_120000_vehicle_titles.down,
    name: '20260916_120000_vehicle_titles',
  },
  {
    up: migration_20260916_120100_vehicle_saved_state.up,
    down: migration_20260916_120100_vehicle_saved_state.down,
    name: '20260916_120100_vehicle_saved_state',
  },
];
